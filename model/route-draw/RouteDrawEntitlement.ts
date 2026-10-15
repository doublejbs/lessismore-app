import { doc, DocumentData, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { makeAutoObservable, reaction, runInAction } from 'mobx';
import type Firebase from '@/model/firebase/Firebase';
import type NetworkStatus from '@/model/offline/NetworkStatus';
import type OfflineEntitlement from '@/model/offline/OfflineEntitlement';
import RouteDrawClaimResult from './RouteDrawClaimResult';
import RouteDrawQuotaStatus from './RouteDrawQuotaStatus';
import { RouteDrawTarget } from './RouteDrawTarget';
import RouteDrawTargetKind from './RouteDrawTargetKind';

// 무료 기록 문서(DM-36) — 문서 id = uid. 앱은 읽기만 한다(쓰기는 함수만).
const QUOTA_COLLECTION = 'route-draw-quota';
// 무료 1회를 정하는 함수(RD-8). 라우팅 함수와 같은 서울 리전이다.
const FUNCTION_REGION = 'asia-northeast3';
const CLAIM_FUNCTION_NAME = 'claimFreeRouteDraw';
const CLAIM_REASON_USED = 'used';
// 구독이 에러로 끊기면 이만큼 뒤에 다시 붙는다(ms) — 실패한 onSnapshot은 스스로 다시 붙지 않는다.
const RESUBSCRIBE_DELAY_MS = 30 * 1000;
/**
 * 미확정 기록을 "방금 저장해 서버 확정을 기다리는 중"으로 보는 시간(ms). 트리거가 확정하기까지 보통 몇 초, 콜드
 * 스타트·재시도가 겹치면 수십 초다. 이 안에서는 무료 1회를 쓴 것으로 보고(새로 그리기를 막는다 — 다 그리고 저장
 * 하다 거절되는 일을 막는다), 그 코스 수정은 연다. 넘으면 저장이 실패해 코스가 안 생긴 것으로 보고 1회를 되돌린다.
 */
const PENDING_CONFIRM_WINDOW_MS = 2 * 60 * 1000;

const isTargetKind = (value: unknown): value is RouteDrawTargetKind =>
  Object.values(RouteDrawTargetKind).some(kind => kind === value);

// 무료 기록 한 건(DM-36) — 확정 여부와 정한 시각을 함께 든다(확정 전 창 판단, RD-8).
interface FreeRouteRecord {
  target: RouteDrawTarget;
  confirmed: boolean;
  claimedAtMs: number;
}

const readClaimedAtMs = (value: unknown): number => {
  const toMillis = (value as { toMillis?: () => number } | null)?.toMillis;

  return typeof toMillis === 'function' ? toMillis.call(value) : 0;
};

/**
 * 문서의 `freeRoute` → 기록(RD-8 · DM-36). 모양이 틀리면 `null`(서버가 쓰는 값이라 틀릴 일이 없다).
 * 확정 여부(`confirmed`)는 판단 쪽(`canDrawNew`·`canEdit`)에서 읽는다.
 */
const toFreeRouteRecord = (
  data: DocumentData | undefined
): FreeRouteRecord | null => {
  const value: unknown = data?.freeRoute;

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const { kind, parentId, routeId } = value as Record<string, unknown>;

  if (
    !isTargetKind(kind) ||
    typeof parentId !== 'string' ||
    typeof routeId !== 'string' ||
    !parentId ||
    !routeId
  ) {
    return null;
  }

  return {
    target: { kind, parentId, routeId },
    confirmed: data?.confirmed === true,
    claimedAtMs: readClaimedAtMs(data?.claimedAt),
  };
};

const isSameTarget = (a: RouteDrawTarget, b: RouteDrawTarget) =>
  a.kind === b.kind && a.parentId === b.parentId && a.routeId === b.routeId;

/**
 * 코스 그리기 권한 (RouteDraw RD-8 · Subscription SUB-12). `App`이 하나 만들어 앱 수명 동안 든다.
 *
 * - **플러스**(`premium`, 체험 포함) → 새로 그리기·수정 모두 된다. 판단 소스는 오프라인 저장 게이트(SUB-11)와 같은
 *   `OfflineEntitlement.isEntitled()`다 — 구독 판단을 두 벌로 두지 않는다.
 * - 아니면 무료 기록 `route-draw-quota/{uid}`(DM-36)를 실시간으로 읽는다: `freeRoute`가 없거나 아직 확정되지
 *   않았으면(`confirmed != true`) 새로 그리기 1회, 확정됐으면 그 코스 수정만 된다. 최종 판단은 서버(`claimFreeRouteDraw`)다.
 * - 기록을 못 읽었으면(오프라인 첫 읽기·실패) 새로 그리기·수정 모두 안 된다(`isLoaded() == false`) — 누르면
 *   화면이 `온라인에서 확인할 수 있어요`를 알린다.
 */
class RouteDrawEntitlement {
  public static new(
    firebase: Firebase,
    networkStatus: NetworkStatus,
    getPlusEntitlement: () => OfflineEntitlement | null
  ) {
    return new RouteDrawEntitlement(
      firebase,
      networkStatus,
      getPlusEntitlement
    );
  }

  private status = RouteDrawQuotaStatus.Unknown;
  // 읽은 기록이 누구의 것인지 — 계정이 바뀌는 사이 앞 계정의 기록으로 판단하지 않게.
  private quotaUserId = '';
  // 무료 기록(확정 여부·정한 시각 포함). 판단 규칙은 `isFreeUsed`·`canEdit`.
  private freeRoute: FreeRouteRecord | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private started = false;

  private constructor(
    private readonly firebase: Firebase,
    private readonly networkStatus: NetworkStatus,
    private readonly getPlusEntitlement: () => OfflineEntitlement | null
  ) {
    makeAutoObservable<
      RouteDrawEntitlement,
      | 'firebase'
      | 'networkStatus'
      | 'getPlusEntitlement'
      | 'unsubscribe'
      | 'started'
      | 'retryTimer'
    >(this, {
      firebase: false,
      networkStatus: false,
      getPlusEntitlement: false,
      unsubscribe: false,
      retryTimer: false,
      started: false,
    });
  }

  /**
   * 로그인 계정이 바뀌면 그 계정의 기록을 다시 구독하고, 못 읽은 채 연결이 돌아오면 다시 시도한다(실패한 구독은
   * 스스로 다시 붙지 않는다). 한 번만 부른다(`App.initialize`).
   */
  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    reaction(
      () => ({
        userId: this.firebase.getUserId(),
        online: this.networkStatus.isOnline(),
      }),
      ({ userId, online }) => {
        const retry = online && this.status === RouteDrawQuotaStatus.Unknown;

        if (userId !== this.quotaUserId || retry || !this.unsubscribe) {
          this.subscribe(userId);
        }
      },
      { fireImmediately: true }
    );
  }

  // 플러스(체험 포함)인지. 오프라인 저장 게이트와 같은 판단이다(SUB-11).
  public isPlus(): boolean {
    return this.getPlusEntitlement()?.isEntitled() ?? false;
  }

  // 권한을 판단할 수 있는지 — 플러스이거나 지금 계정의 무료 기록을 읽었다.
  public isLoaded(): boolean {
    return this.isPlus() || this.isQuotaLoaded();
  }

  // 무료 1회를 이미 썼는지(확정된 기록이 있다 — 미확정은 아직 안 쓴 것으로 본다). 못 읽었으면 `false`다 — `isLoaded()`와 함께 읽는다.
  public hasUsedFree(): boolean {
    return this.isQuotaLoaded() && this.isFreeUsed();
  }

  // 새로 그리기(RD-8): 플러스이거나, 기록을 읽었고 확정된 무료 코스가 없다(없음·미확정).
  public canDrawNew(): boolean {
    if (this.isPlus()) {
      return true;
    }

    return this.isQuotaLoaded() && !this.isFreeUsed();
  }

  // 그린 코스 수정(RD-7 · RD-8): 플러스이거나, 그 코스가 무료 코스다(확정 전이어도 — 목록에 있다는 것이 생성됐다는 뜻이다).
  public canEdit(target: RouteDrawTarget): boolean {
    if (this.isPlus()) {
      return true;
    }

    const freeRoute = this.freeRoute;

    return (
      this.isQuotaLoaded() &&
      freeRoute !== null &&
      isSameTarget(freeRoute.target, target)
    );
  }

  /**
   * 무료 1회를 쓴 것으로 보는지: 확정됐거나, 미확정이지만 방금 정해 서버 확정을 기다리는 중이다(창 안).
   * 창이 지난 미확정은 저장이 실패한 것으로 보고 1회가 남은 것으로 본다(서버도 그때 다른 코스로 다시 정한다).
   */
  private isFreeUsed(): boolean {
    const freeRoute = this.freeRoute;

    if (!freeRoute) {
      return false;
    }

    if (freeRoute.confirmed) {
      return true;
    }

    return Date.now() - freeRoute.claimedAtMs < PENDING_CONFIRM_WINDOW_MS;
  }

  /**
   * 무료 1회를 이 코스로 정한다(RD-8) — 업로드 **직전**에 부른다. 서버가 판단한다: 기록이 없거나, 같은 코스이거나,
   * 정해 둔 코스가 실제로 생기지 않았으면(`confirmed == false`) 통과. 다른 코스로 이미 썼으면 `Used`.
   * 플러스 사용자는 서버가 그대로 통과시킨다(`premium: true`).
   */
  public async claimFree(
    target: RouteDrawTarget
  ): Promise<RouteDrawClaimResult> {
    const firebaseApp = this.firebase.getFirebaseApp();

    if (!firebaseApp) {
      return RouteDrawClaimResult.Failed;
    }

    try {
      const callable = httpsCallable<RouteDrawTarget, unknown>(
        getFunctions(firebaseApp, FUNCTION_REGION),
        CLAIM_FUNCTION_NAME
      );
      const response = await callable({
        kind: target.kind,
        parentId: target.parentId,
        routeId: target.routeId,
      });
      const body = (
        typeof response.data === 'object' && response.data !== null
          ? response.data
          : {}
      ) as Record<string, unknown>;

      if (body.ok === true) {
        return RouteDrawClaimResult.Claimed;
      }

      if (body.reason === CLAIM_REASON_USED) {
        return RouteDrawClaimResult.Used;
      }

      return RouteDrawClaimResult.Failed;
    } catch (error) {
      console.warn('[RouteDrawEntitlement] 무료 1회 기록 실패', error); // l10n-ignore: 개발자 로그

      return RouteDrawClaimResult.Failed;
    }
  }

  private isQuotaLoaded(): boolean {
    const userId = this.firebase.getUserId();

    return (
      !!userId &&
      this.quotaUserId === userId &&
      this.status === RouteDrawQuotaStatus.Loaded
    );
  }

  private subscribe(userId: string) {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.unsubscribe?.();
    this.unsubscribe = null;
    this.setQuota(userId, RouteDrawQuotaStatus.Unknown, null);

    if (!userId) {
      return;
    }

    try {
      this.unsubscribe = onSnapshot(
        doc(this.firebase.getStore(), QUOTA_COLLECTION, userId),
        { includeMetadataChanges: true },
        snapshot => {
          // 오프라인 첫 읽기는 캐시에 문서가 없어도 "없음"으로 온다 — 서버 답이 아니므로 기록 없음으로 믿지 않는다.
          if (!snapshot.exists() && snapshot.metadata.fromCache) {
            return;
          }

          this.setQuota(
            userId,
            RouteDrawQuotaStatus.Loaded,
            snapshot.exists() ? toFreeRouteRecord(snapshot.data()) : null
          );
        },
        error => {
          // 읽기 실패(권한·네트워크)는 "판단 불가"로 둔다 — 그리기·수정을 막고 누르면 안내한다(RD-8).
          // 끊긴 구독은 스스로 다시 붙지 않으므로 잠시 뒤 다시 붙는다(그사이 계정이 바뀌었으면 그 계정으로).
          console.warn('[RouteDrawEntitlement] 무료 기록 구독 실패', error); // l10n-ignore: 개발자 로그
          this.unsubscribe = null;
          this.setQuota(userId, RouteDrawQuotaStatus.Unknown, null);
          this.scheduleResubscribe();
        }
      );
    } catch (error) {
      console.warn('[RouteDrawEntitlement] 무료 기록 구독 시작 실패', error); // l10n-ignore: 개발자 로그
    }
  }

  private scheduleResubscribe() {
    if (this.retryTimer !== null) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.subscribe(this.firebase.getUserId());
    }, RESUBSCRIBE_DELAY_MS);
  }

  private setQuota(
    userId: string,
    status: RouteDrawQuotaStatus,
    freeRoute: FreeRouteRecord | null
  ) {
    runInAction(() => {
      this.quotaUserId = userId;
      this.status = status;
      this.freeRoute = freeRoute;
    });
  }
}

export default RouteDrawEntitlement;
