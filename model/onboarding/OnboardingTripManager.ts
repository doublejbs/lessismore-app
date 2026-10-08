import { makeAutoObservable, runInAction } from 'mobx';
import Firebase from '../firebase/Firebase';
import BagStore from '../store/BagStore';
import LocalStorageManager from '../storage/LocalStorageManager';
import OnboardingTripStatus from './OnboardingTripStatus';
import OnboardingTripEntry from './OnboardingTripEntry';
import {
  OnboardingTripDraft,
  parseOnboardingTripDraft,
} from './OnboardingTripDraft';

const STORAGE_KEY_PREFIX = 'onboarding-first-trip_';
// 기기 단위 첫 실행 기록(OB-11).
const DEVICE_STORAGE_KEY = 'onboarding-first-trip_device';
// 로그인 이어가기 초안(OB-12).
const DRAFT_STORAGE_KEY = 'onboarding-first-trip-draft';
// 비로그인 판정 키 — uid 자리에 둔다(로그인 사용자 uid는 비어 있지 않다).
const GUEST_KEY = '';

interface OnboardingTripRecord {
  status: OnboardingTripStatus;
  at: string;
}

/**
 * 첫 여행 만들기 가이드의 전역 상태(OB-1·OB-2·OB-11·OB-12).
 *
 * - 로그인 대상 판정: 로그인 + 약관 동의 + 여행 0개 + 이 기기에 uid 기록 없음(OB-1).
 * - 비로그인 대상 판정: 기기 기록 `onboarding-first-trip_device` 없음(OB-11).
 * - 로그인 이어가기: 초안 `onboarding-first-trip-draft`가 있으면 위 판정보다 먼저 가이드를 다시 연다(OB-12).
 * - 판정은 세션당 키(uid 또는 비로그인)마다 1회. 기록이 하나라도 있으면 다시 띄우지 않는다.
 * - 이 기기 첫 판정(기기 기록 없음)이면 가이드 대신 환영 화면을 먼저 띄운다(OB-14·OB-15).
 * - 오버레이 우선순위(APP-10): 판정 전·가이드 표시 중에는 신기능 팝업·공지를 막는다.
 */
class OnboardingTripManager {
  public static new(firebase: Firebase, bagStore: BagStore) {
    return new OnboardingTripManager(firebase, bagStore);
  }

  // 판정을 마친 키(uid 또는 GUEST_KEY). 현재 키와 다르면 아직 판정 전이다(재로그인·로그아웃 포함).
  private resolvedKey: string | null = null;
  private checking = false;
  private showing = false;
  // 이번 세션에 가이드를 띄웠는지 — 시작 시 알림 권한 요청을 건너뛸지, 같은 세션에 두 번 띄울지 판단한다(OB-8).
  private presentedThisSession = false;
  // 지금 띄운 가이드가 기기 단위 기록을 갖는지(비로그인 첫 실행·이어가기, OB-11).
  private deviceScoped = false;
  // 지금 떠 있는 것이 가이드 앞의 환영 화면인지(OB-14). 가이드로 넘어가면 false.
  private welcomeShowing = false;
  // 이어가기로 연 가이드가 받아 갈 초안(OB-12). 가이드가 마운트 때 한 번 가져간다.
  private resumeDraft: OnboardingTripDraft | null = null;

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
   * 탭에 도착했을 때 레이아웃이 부른다. 대상이면 노출 기록(`presented`)을 먼저 남기고 띄울 화면을 돌려준다
   * — 호출측이 환영 화면 또는 가이드 라우트를 띄운다. 도중에 앱이 종료돼도 다시 뜨지 않는다(OB-1·OB-11·OB-15).
   */
  public async checkAndMarkPresented(): Promise<OnboardingTripEntry> {
    const loggedIn = this.firebase.isLoggedIn();
    const key = this.getCurrentKey();

    if (this.checking || this.resolvedKey === key) {
      return OnboardingTripEntry.None;
    }

    if (loggedIn && (!key || !this.firebase.hasUserAgreedToTerms())) {
      return OnboardingTripEntry.None;
    }

    this.setChecking(true);

    try {
      const draft = await this.loadDraft();

      // 판정하는 동안 로그인 상태가 바뀌었으면 이 결과를 버린다 — 다음 탭 도착에서 새 키로 판정한다.
      if (this.getCurrentKey() !== key) {
        return OnboardingTripEntry.None;
      }

      return loggedIn
        ? await this.checkLoggedIn(key, draft)
        : await this.checkGuest(draft);
    } catch (error) {
      // 예상 못 한 실패는 이번 세션엔 띄우지 않고 판정을 끝낸다 — 팝업 차단(APP-10)·시작 시 권한 요청(OB-8)이
      // 판정 대기에 묶여 남지 않게 한다. 기록은 남기지 않으므로 다음 실행에 다시 판정한다.
      console.warn('첫 여행 가이드 판정 실패', error); // l10n-ignore: console 개발자 로그
      this.resolve(key);

      return OnboardingTripEntry.None;
    } finally {
      this.setChecking(false);
    }
  }

  private async checkLoggedIn(
    uid: string,
    draft: OnboardingTripDraft | null
  ): Promise<OnboardingTripEntry> {
    // 기기 기록이 없으면 이 기기 첫 판정이다 — 가이드 앞에 환영 화면을 띄운다(OB-15).
    const isFirstOnDevice = !(await LocalStorageManager.get<OnboardingTripRecord>(
      DEVICE_STORAGE_KEY
    ));

    // 이 기기에서 이미 앱을 쓴 사람 — 로그아웃해도 비로그인 첫 실행 가이드를 보지 않는다(OB-11).
    await this.markDeviceUsed();

    // 로그인 이어가기 — 계정에 여행이 있어도 사용자가 직접 고른 여행을 만든다(OB-12).
    if (draft) {
      await this.saveStatus(
        this.getStorageKey(uid),
        OnboardingTripStatus.Presented
      );
      this.present(uid, draft, false, false);

      return OnboardingTripEntry.Guide;
    }

    // 같은 세션에 비로그인 가이드를 이미 띄웠으면 로그인 직후 다시 띄우지 않는다(기록도 남기지 않는다).
    if (this.presentedThisSession) {
      this.resolve(uid);

      return OnboardingTripEntry.None;
    }

    const record = await LocalStorageManager.get<OnboardingTripRecord>(
      this.getStorageKey(uid)
    );

    if (record) {
      this.resolve(uid);

      return OnboardingTripEntry.None;
    }

    let bagCount: number;

    try {
      bagCount = await this.bagStore.getBagCountOrThrow();
    } catch (error) {
      // 오프라인 등 — 0개로 오인하지 않는다. 이번 세션엔 띄우지 않고 기록도 남기지 않는다(OB-1).
      console.warn('첫 여행 가이드 대상 판정 실패', error); // l10n-ignore: console 개발자 로그
      this.resolve(uid);

      return OnboardingTripEntry.None;
    }

    if (this.getCurrentKey() !== uid) {
      return OnboardingTripEntry.None;
    }

    if (bagCount > 0) {
      await this.saveStatus(
        this.getStorageKey(uid),
        OnboardingTripStatus.NotNeeded
      );
      this.resolve(uid);

      return OnboardingTripEntry.None;
    }

    await this.saveStatus(
      this.getStorageKey(uid),
      OnboardingTripStatus.Presented
    );
    this.present(uid, null, false, isFirstOnDevice);

    return isFirstOnDevice
      ? OnboardingTripEntry.Welcome
      : OnboardingTripEntry.Guide;
  }

  private async checkGuest(
    draft: OnboardingTripDraft | null
  ): Promise<OnboardingTripEntry> {
    // 인증 전에 앱이 종료된 로그인 이어가기 — 완료 단계로 한 번만 다시 연다(OB-12).
    if (draft?.resumable) {
      await this.saveDraft({ ...draft, resumable: false });
      this.present(GUEST_KEY, draft, true, false);

      return OnboardingTripEntry.Guide;
    }

    const record =
      await LocalStorageManager.get<OnboardingTripRecord>(DEVICE_STORAGE_KEY);

    if (record) {
      this.resolve(GUEST_KEY);

      return OnboardingTripEntry.None;
    }

    // 비로그인 첫 실행은 환영 화면부터 — 가이드는 환영 화면의 `다음 백패킹 준비하기`로 연다(OB-11·OB-15).
    await this.saveStatus(DEVICE_STORAGE_KEY, OnboardingTripStatus.Presented);
    this.present(GUEST_KEY, null, true, true);

    return OnboardingTripEntry.Welcome;
  }

  private present(
    key: string,
    draft: OnboardingTripDraft | null,
    deviceScoped: boolean,
    welcome: boolean
  ) {
    runInAction(() => {
      this.resolvedKey = key;
      this.presentedThisSession = true;
      this.showing = true;
      this.deviceScoped = deviceScoped;
      this.welcomeShowing = welcome;
      this.resumeDraft = draft;
    });
  }

  /**
   * 환영 화면 `다음 백패킹 준비하기`(OB-15) — 같은 표시 상태로 가이드에 넘긴다. 기록·팝업 차단은 이어진다.
   */
  public startGuideFromWelcome(): void {
    this.welcomeShowing = false;
  }

  /**
   * 환영 화면에서 로그인 성공(OB-15). 기기 기록만 `dismissed`로 남기고 uid 기록은 남기지 않는다
   * — 같은 세션에는 가이드를 다시 띄우지 않고(`presentedThisSession`), 여행 0개 계정은 다음 실행에 가이드를 본다.
   */
  public async finishWelcomeAfterLogin(): Promise<void> {
    runInAction(() => {
      this.showing = false;
      this.welcomeShowing = false;
      this.deviceScoped = false;
    });

    await this.saveStatus(DEVICE_STORAGE_KEY, OnboardingTripStatus.Dismissed);
  }

  public isWelcomeShowing(): boolean {
    return this.welcomeShowing;
  }

  /**
   * 비로그인 홈의 `첫 여행 만들기`(HM-8)로 가이드를 직접 연다 — 기기 기록과 무관하게 연다.
   * 이미 떠 있으면 false(중복 push 방지).
   */
  public presentOnDemand(): boolean {
    if (this.showing || this.checking) {
      return false;
    }

    this.present(this.getCurrentKey(), null, !this.firebase.isLoggedIn(), false);

    return true;
  }

  // 가이드가 마운트 때 한 번 가져간다 — 이어가기가 아니면 null(OB-12).
  public takeResumeDraft(): OnboardingTripDraft | null {
    const draft = this.resumeDraft;

    this.resumeDraft = null;

    return draft;
  }

  // 가이드를 닫거나(dismissed) 만들었을 때(completed). 초안은 어느 쪽이든 지운다.
  public async finish(status: OnboardingTripStatus): Promise<void> {
    const loggedIn = this.firebase.isLoggedIn();
    const uid = this.firebase.getUserId();
    const deviceScoped = this.deviceScoped;

    runInAction(() => {
      this.showing = false;
      this.deviceScoped = false;
      this.welcomeShowing = false;

      if (loggedIn && uid) {
        // 이 uid는 가이드를 거쳤다 — 같은 세션에 탭으로 돌아와도 다시 판정하지 않는다.
        this.resolvedKey = uid;
      }
    });

    await this.clearDraft();

    if (loggedIn && uid) {
      await this.saveStatus(this.getStorageKey(uid), status);
    }

    if (deviceScoped || loggedIn) {
      await this.saveStatus(DEVICE_STORAGE_KEY, status);
    }
  }

  /**
   * 로그인 이어가기 도중 가이드가 내려감(약관 리다이렉트 등, OB-12). 기록을 남기지 않고 초안을 그대로 둔다
   * — 탭에 다시 도착하면 초안으로 가이드를 다시 연다.
   */
  public suspend(): void {
    this.showing = false;
    this.deviceScoped = false;
    this.welcomeShowing = false;
  }

  public async saveDraft(draft: OnboardingTripDraft): Promise<void> {
    await LocalStorageManager.set(DRAFT_STORAGE_KEY, draft);
  }

  public async clearDraft(): Promise<void> {
    await LocalStorageManager.remove(DRAFT_STORAGE_KEY);
  }

  private async loadDraft(): Promise<OnboardingTripDraft | null> {
    const stored = await LocalStorageManager.get<unknown>(DRAFT_STORAGE_KEY);

    if (stored === null) {
      return null;
    }

    const draft = parseOnboardingTripDraft(stored, Date.now());

    if (!draft) {
      // 형식이 다르거나 24시간이 지난 초안은 버린다.
      await this.clearDraft();
    }

    return draft;
  }

  private async markDeviceUsed(): Promise<void> {
    const record =
      await LocalStorageManager.get<OnboardingTripRecord>(DEVICE_STORAGE_KEY);

    if (!record) {
      await this.saveStatus(DEVICE_STORAGE_KEY, OnboardingTripStatus.NotNeeded);
    }
  }

  // 신기능 팝업·공지를 막을지(APP-10). 비로그인도 첫 실행 판정 전·가이드 표시 중에는 막는다(OB-11).
  public isBlockingPopups(): boolean {
    if (this.showing) {
      return true;
    }

    if (this.firebase.isLoggedIn() && !this.firebase.hasUserAgreedToTerms()) {
      return true;
    }

    return this.resolvedKey !== this.getCurrentKey();
  }

  // 현재 uid의 판정이 끝났고 가이드가 떠 있지 않은지 — 시작 시 권한 요청 시점 판단용(OB-8).
  public isSettledForCurrentUser(): boolean {
    const uid = this.firebase.getUserId();

    return (
      this.firebase.isLoggedIn() &&
      !!uid &&
      this.resolvedKey === uid &&
      !this.showing
    );
  }

  // 이번 세션에 환영 화면·가이드를(로그인·비로그인 어느 쪽이든) 띄웠는지(OB-8).
  public wasPresentedThisSession(): boolean {
    return this.presentedThisSession;
  }

  public isShowing(): boolean {
    return this.showing;
  }

  private getCurrentKey(): string {
    return this.firebase.isLoggedIn() ? this.firebase.getUserId() : GUEST_KEY;
  }

  private resolve(key: string) {
    this.resolvedKey = key;
  }

  private setChecking(value: boolean) {
    this.checking = value;
  }

  private async saveStatus(storageKey: string, status: OnboardingTripStatus) {
    const record: OnboardingTripRecord = {
      status,
      at: new Date().toISOString(),
    };

    await LocalStorageManager.set(storageKey, record);
  }

  private getStorageKey(uid: string): string {
    return `${STORAGE_KEY_PREFIX}${uid}`;
  }
}

export default OnboardingTripManager;
