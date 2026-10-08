import { makeAutoObservable, runInAction } from 'mobx';
import Firebase from '../firebase/Firebase';
import BagStore from '../store/BagStore';
import LocalStorageManager from '../storage/LocalStorageManager';
import OnboardingTripStatus from './OnboardingTripStatus';

const STORAGE_KEY_PREFIX = 'onboarding-first-trip_';

interface OnboardingTripRecord {
  status: OnboardingTripStatus;
  at: string;
}

/**
 * 첫 여행 만들기 가이드의 전역 상태(OB-1·OB-2).
 *
 * - 대상 판정: 로그인 + 약관 동의 + 여행 0개 + 이 기기에 노출 기록 없음. 판정은 세션당 uid마다 1회.
 * - 노출 기록: AsyncStorage `onboarding-first-trip_{uid}`(APP-6). 기록이 하나라도 있으면 다시 띄우지 않는다.
 * - 오버레이 우선순위(APP-10): 판정 전·가이드 표시 중에는 신기능 팝업·공지를 막는다.
 */
class OnboardingTripManager {
  public static new(firebase: Firebase, bagStore: BagStore) {
    return new OnboardingTripManager(firebase, bagStore);
  }

  // 판정을 마친 uid. 현재 uid와 다르면 아직 판정 전이다(재로그인 포함).
  private resolvedUid: string | null = null;
  private checking = false;
  private showing = false;
  // 이번 세션에 가이드를 띄운 uid — 시작 시 알림 권한 요청을 건너뛸지 판단한다(OB-8).
  private presentedUid: string | null = null;

  private constructor(
    private readonly firebase: Firebase,
    private readonly bagStore: BagStore
  ) {
    makeAutoObservable<OnboardingTripManager, 'firebase' | 'bagStore'>(this, {
      firebase: false,
      bagStore: false,
    });
  }

  /**
   * 탭에 도착했을 때 레이아웃이 부른다. 대상이면 노출 기록(`presented`)을 먼저 남기고 `true`를 돌려준다
   * — 호출측이 가이드 라우트를 띄운다. 도중에 앱이 종료돼도 다시 뜨지 않는다(OB-1).
   */
  public async checkAndMarkPresented(): Promise<boolean> {
    const uid = this.firebase.getUserId();

    if (
      !uid ||
      !this.firebase.isLoggedIn() ||
      !this.firebase.hasUserAgreedToTerms() ||
      this.checking ||
      this.resolvedUid === uid
    ) {
      return false;
    }

    this.setChecking(true);

    try {
      const record = await LocalStorageManager.get<OnboardingTripRecord>(
        this.getStorageKey(uid)
      );

      if (record) {
        this.resolve(uid);

        return false;
      }

      let bagCount: number;

      try {
        bagCount = await this.bagStore.getBagCountOrThrow();
      } catch (error) {
        // 오프라인 등 — 0개로 오인하지 않는다. 이번 세션엔 띄우지 않고 기록도 남기지 않는다(OB-1).
        console.warn('첫 여행 가이드 대상 판정 실패', error); // l10n-ignore: console 개발자 로그
        this.resolve(uid);

        return false;
      }

      // 판정하는 동안 계정이 바뀌었으면 이 결과를 버린다 — 다음 탭 도착에서 새 uid로 판정한다.
      if (this.firebase.getUserId() !== uid) {
        return false;
      }

      if (bagCount > 0) {
        await this.saveStatus(uid, OnboardingTripStatus.NotNeeded);
        this.resolve(uid);

        return false;
      }

      await this.saveStatus(uid, OnboardingTripStatus.Presented);

      runInAction(() => {
        this.presentedUid = uid;
        this.showing = true;
        this.resolvedUid = uid;
      });

      return true;
    } finally {
      this.setChecking(false);
    }
  }

  public async finish(status: OnboardingTripStatus): Promise<void> {
    const uid = this.firebase.getUserId();

    this.setShowing(false);

    if (uid) {
      await this.saveStatus(uid, status);
    }
  }

  // 신기능 팝업·공지를 막을지(APP-10). 비로그인 사용자에게는 영향이 없다.
  public isBlockingPopups(): boolean {
    if (!this.firebase.isLoggedIn()) {
      return false;
    }

    if (!this.firebase.hasUserAgreedToTerms()) {
      return true;
    }

    if (this.resolvedUid !== this.firebase.getUserId()) {
      return true;
    }

    return this.showing;
  }

  // 현재 uid의 판정이 끝났고 가이드가 떠 있지 않은지 — 시작 시 권한 요청 시점 판단용(OB-8).
  public isSettledForCurrentUser(): boolean {
    const uid = this.firebase.getUserId();

    return !!uid && this.resolvedUid === uid && !this.showing;
  }

  public wasPresentedThisSession(): boolean {
    const uid = this.firebase.getUserId();

    return !!uid && this.presentedUid === uid;
  }

  public isShowing(): boolean {
    return this.showing;
  }

  private resolve(uid: string) {
    this.resolvedUid = uid;
  }

  private setChecking(value: boolean) {
    this.checking = value;
  }

  private setShowing(value: boolean) {
    this.showing = value;
  }

  private async saveStatus(uid: string, status: OnboardingTripStatus) {
    const record: OnboardingTripRecord = {
      status,
      at: new Date().toISOString(),
    };

    await LocalStorageManager.set(this.getStorageKey(uid), record);
  }

  private getStorageKey(uid: string): string {
    return `${STORAGE_KEY_PREFIX}${uid}`;
  }
}

export default OnboardingTripManager;
