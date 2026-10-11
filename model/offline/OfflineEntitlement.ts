import { makeAutoObservable, reaction, runInAction } from 'mobx';
import type Firebase from '@/model/firebase/Firebase';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import type SubscriptionStore from '@/model/subscription/SubscriptionStore';
import type NetworkStatus from './NetworkStatus';

// 마지막으로 확인한 권한을 기기에 남겨 두는 키(OF-7 — 오프라인에서도 판단해야 한다).
const ENTITLEMENT_SNAPSHOT_KEY = 'offline.entitlement';

/**
 * 기기에 남긴 권한 기록. `expiresAt`이 `null`이면 만료 없는 권한(평생)이다.
 * 기록이 아예 없으면 "한 번도 온라인에서 확인 못 함"이라 잠긴 것으로 본다(OF-7).
 */
interface EntitlementSnapshot {
  userId: string;
  expiresAt: string | null;
}

const isSnapshot = (value: unknown): value is EntitlementSnapshot => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const snapshot = value as Partial<EntitlementSnapshot>;

  return (
    typeof snapshot.userId === 'string' &&
    (snapshot.expiresAt === null || typeof snapshot.expiresAt === 'string')
  );
};

/**
 * 오프라인 저장의 권한 판단 (SUB-11 · OF-7). **저장·갱신·열람 모두** 이 값 하나를 본다.
 *
 * 계약(구독 브랜치와 맞춘 것 — `SubscriptionStore`의 의미를 바꾸지 않는다):
 * - `SubscriptionStore.isSubscribed()`는 RevenueCat `customerInfo.entitlements.active[권한]`이 있는지다
 *   (체험·결제 유예 포함). `getExpirationDate()`는 그 권한의 만료 시각(ISO, 평생이면 null)이다.
 * - 구독 중으로 보이면 만료 시각이 지금보다 뒤일 때만 살아 있다고 본다(캐시된 customerInfo가 낡았을 수 있다).
 * - 스토어가 구독 중이 아니라고 하면: **온라인이고 상태가 확정됐을 때만** 그 말을 믿는다. 오프라인이거나
 *   아직 확정 전이면 스토어의 "미구독"은 SDK 실패·제한 시간 폴백(SUB-4 — 실패하면 미구독으로 확정)일 수 있어,
 *   기기에 남겨 둔 마지막 권한 기록(`expiresAt`)으로 판단한다 — "캐시된 customerInfo 만료 시각 기준"(OF-7).
 * - 기록은 스토어가 구독 중이라고 할 때마다 갱신하고, 온라인에서 확정적으로 미구독이면 지운다.
 *   로그아웃(`clear`)하면 지운다 — 권한은 계정에 묶여 있다.
 * - 해지 예약은 종료일까지, 결제 유예는 스토어가 권한을 유지하는 동안 살아 있다(SDK 값을 그대로 따른다).
 *   다만 오프라인에서 기록의 만료 시각이 지나면 유예 중이라도 잠긴다(연결되면 스토어 값으로 다시 열린다).
 */
class OfflineEntitlement {
  public static new(
    subscriptionStore: SubscriptionStore,
    networkStatus: NetworkStatus,
    firebase: Firebase
  ) {
    return new OfflineEntitlement(subscriptionStore, networkStatus, firebase);
  }

  private snapshot: EntitlementSnapshot | null = null;
  // 시간이 흐르면 만료 판정이 바뀐다 — 화면이 다시 그려지도록 1분마다 올린다.
  private clock = Date.now();
  private started = false;

  private constructor(
    private readonly subscriptionStore: SubscriptionStore,
    private readonly networkStatus: NetworkStatus,
    private readonly firebase: Firebase
  ) {
    makeAutoObservable<
      OfflineEntitlement,
      'subscriptionStore' | 'networkStatus' | 'firebase' | 'started'
    >(this, {
      subscriptionStore: false,
      networkStatus: false,
      firebase: false,
      started: false,
    });
  }

  public async initialize(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;

    const stored = await LocalStorageManager.get<unknown>(
      ENTITLEMENT_SNAPSHOT_KEY
    );

    runInAction(() => {
      this.snapshot = isSnapshot(stored) ? stored : null;
    });

    reaction(
      () => ({
        resolved: this.subscriptionStore.isResolved(),
        available: this.subscriptionStore.isAvailable(),
        subscribed: this.subscriptionStore.isSubscribed(),
        expiresAt: this.subscriptionStore.getExpirationDate(),
        online: this.networkStatus.isOnline(),
        userId: this.firebase.getUserId(),
        linkedUserId: this.subscriptionStore.getLinkedUserId(),
      }),
      state => {
        this.record(state);
      },
      { fireImmediately: true }
    );

    setInterval(() => {
      runInAction(() => {
        this.clock = Date.now();
      });
    }, 60 * 1000);
  }

  // 권한이 살아 있는지(체험 포함). 웹·비로그인이면 false.
  public isEntitled(): boolean {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return false;
    }

    const now = this.clock;

    // 구독 상태가 지금 계정에 연결된 것일 때만 믿는다(계정 전환 중 앞 계정의 권한이 섞이지 않게).
    if (
      this.subscriptionStore.isSubscribed() &&
      this.subscriptionStore.getLinkedUserId() === userId
    ) {
      return OfflineEntitlement.isAlive(
        this.subscriptionStore.getExpirationDate(),
        now
      );
    }

    if (
      this.networkStatus.isOnline() &&
      this.subscriptionStore.isResolved() &&
      this.subscriptionStore.isAvailable()
    ) {
      return false;
    }

    const snapshot = this.snapshot;

    if (!snapshot || snapshot.userId !== userId) {
      return false;
    }

    return OfflineEntitlement.isAlive(snapshot.expiresAt, now);
  }

  // 로그아웃·탈퇴(OF-2) — 권한 기록은 계정에 묶여 있다.
  public async clear(): Promise<void> {
    this.setSnapshot(null);
    await LocalStorageManager.remove(ENTITLEMENT_SNAPSHOT_KEY);
  }

  private record(state: {
    resolved: boolean;
    available: boolean;
    subscribed: boolean;
    expiresAt: string | null;
    online: boolean;
    userId: string;
    linkedUserId: string;
  }) {
    // 구독 상태가 지금 로그인한 계정의 것일 때만 남긴다(계정 전환 중 앞 계정의 권한이 섞이지 않게).
    if (!state.userId || state.linkedUserId !== state.userId) {
      return;
    }

    if (state.subscribed) {
      const next: EntitlementSnapshot = {
        userId: state.userId,
        expiresAt: state.expiresAt,
      };

      if (
        this.snapshot?.userId === next.userId &&
        this.snapshot.expiresAt === next.expiresAt
      ) {
        return;
      }

      this.setSnapshot(next);
      void LocalStorageManager.set(ENTITLEMENT_SNAPSHOT_KEY, next);

      return;
    }

    // 온라인에서 확정적으로 미구독이면 기록을 지운다(만료·환불·취소 — OF-7).
    if (state.online && state.resolved && state.available && this.snapshot) {
      this.setSnapshot(null);
      void LocalStorageManager.remove(ENTITLEMENT_SNAPSHOT_KEY);
    }
  }

  private setSnapshot(value: EntitlementSnapshot | null) {
    this.snapshot = value;
  }

  private static isAlive(expiresAt: string | null, now: number): boolean {
    if (expiresAt === null) {
      return true;
    }

    const time = Date.parse(expiresAt);

    return Number.isFinite(time) && time > now;
  }
}

export default OfflineEntitlement;
