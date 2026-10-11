import AsyncStorage from '@react-native-async-storage/async-storage';
import PushTokenStore, { PushTokenRecord } from '../store/PushTokenStore';
import PushTokenPlatform from './PushTokenPlatform';
import { sha256Hex } from './Sha256';

type Unsubscribe = () => void;

export type PushTokenMessaging = {
  getToken: () => Promise<string>;
  onTokenRefresh: (listener: (token: string) => void) => Unsubscribe;
};

type LoginState = {
  isLoggedIn: () => boolean;
  getUserId: () => string;
  // 약관 동의 전에는 토큰을 등록하지 않는다.
  hasAgreedToTerms: () => boolean;
};

type PushTokenRegistrarDependencies = {
  store: PushTokenStore;
  login: LoginState;
  platform: PushTokenPlatform;
  getMessaging: () => PushTokenMessaging | null;
  // OS 알림 권한 허용 여부(조회만 — 이 등록 때문에 권한을 요청하지 않는다).
  isPermissionGranted: () => Promise<boolean>;
  // `여행 추천 알림` 토글(NT-6) 값. 설정 로드가 끝난 값을 돌려줘야 한다.
  isBriefingToggleOn: () => Promise<boolean>;
  getLocale: () => string | null;
  getAppVersion: () => string | null;
};

// 이 기기가 마지막으로 등록한 문서. 로그아웃 때 getToken 없이 지울 수 있고, 포그라운드 재확인 상한에도 쓴다.
type StoredRegistration = {
  userId: string;
  tokenId: string;
  registeredAt: number;
  // 마지막으로 쓴 briefingEnabled. 값이 바뀌면 재확인 상한·중복 묶음을 건너뛰고 바로 쓴다.
  briefingEnabled?: boolean;
};

const REGISTRATION_STORAGE_KEY = 'notification-push-token-registration';

const TOKEN_ID_LENGTH = 32;

// 포그라운드 복귀 재확인은 하루 1회 상한(NT-12 ④).
const FOREGROUND_RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

// 콜드 스타트에 초기화·로그인 effect가 같은 값을 연달아 쓰지 않게 세션 안의 동일 쓰기를 묶는다.
const SAME_WRITE_DEDUPE_MS = 10 * 60 * 1000;

// 로그아웃이 오프라인 등으로 삭제 응답을 기다리며 멈추지 않게 하는 상한.
const UNREGISTER_TIMEOUT_MS = 3 * 1000;

export const getPushTokenId = (token: string): string =>
  sha256Hex(token).slice(0, TOKEN_ID_LENGTH);

const parseStoredRegistration = (raw: unknown): StoredRegistration | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Partial<StoredRegistration>;

  if (
    typeof value.userId !== 'string' ||
    typeof value.tokenId !== 'string' ||
    !Number.isFinite(value.registeredAt)
  ) {
    return null;
  }

  return {
    userId: value.userId,
    tokenId: value.tokenId,
    registeredAt: value.registeredAt as number,
    ...(typeof value.briefingEnabled === 'boolean'
      ? { briefingEnabled: value.briefingEnabled }
      : {}),
  };
};

/**
 * 푸시 토큰 등록(NT-12) — 서버가 사용자 단위 푸시(NT-11 주말 날씨 브리핑)를 보낼 수 있게
 * 이 기기의 FCM 토큰을 `users/{uid}/push-tokens/{tokenId}`(DM-34)에 둔다.
 *
 * - 모든 작업은 한 줄로 직렬화한다 — 로그아웃 삭제와 등록이 엇갈려 지운 문서가 되살아나지 않게.
 * - 실패는 조용히 넘긴다(콘솔 경고만, NT-1).
 * - 웹에서는 만들지 않는다(NotificationManager가 네이티브에서만 생성).
 */
class PushTokenRegistrar {
  public static from(dependencies: PushTokenRegistrarDependencies) {
    return new PushTokenRegistrar(dependencies);
  }

  private queue: Promise<void> = Promise.resolve();
  private tokenRefreshUnsubscribe: Unsubscribe | null = null;
  private lastWrite: { key: string; at: number } | null = null;
  // 로그아웃 삭제를 시작한 uid. 인증 상태가 실제로 비워질 때까지(reset) 이 uid로는 다시 등록하지 않는다.
  private unregisteredUserId: string | null = null;

  private constructor(
    private readonly dependencies: PushTokenRegistrarDependencies
  ) {}

  // 토큰 갱신 콜백을 1회 배선한다(NT-12 ②).
  public start(): void {
    if (this.tokenRefreshUnsubscribe) {
      return;
    }

    try {
      const messaging = this.dependencies.getMessaging();

      if (!messaging) {
        return;
      }

      this.tokenRefreshUnsubscribe = messaging.onTokenRefresh(token => {
        void this.enqueue(() => this.runRegister(token));
      });
    } catch (error) {
      console.warn('PushTokenRegistrar 토큰 갱신 리스너 등록 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  // 멱등 등록(NT-12 ①③). 비로그인·미등록 상태의 권한 미허용이면 아무것도 하지 않는다.
  public register(): Promise<void> {
    return this.enqueue(() => this.runRegister(null));
  }

  // 포그라운드 복귀 재확인 — 같은 사용자로 하루 안에 등록했으면 건너뛴다(NT-12 ④).
  public registerOnForeground(): Promise<void> {
    return this.enqueue(async () => {
      const stored = await this.loadRegistration();
      const isRecent =
        stored !== null &&
        stored.userId === this.dependencies.login.getUserId() &&
        Date.now() - stored.registeredAt < FOREGROUND_RECHECK_INTERVAL_MS;

      // 권한·토글이 바뀌어 briefingEnabled가 달라졌으면 하루 상한을 건너뛰고 바로 쓴다.
      if (isRecent && !(await this.isBriefingChanged(stored))) {
        return;
      }

      await this.runRegister(null);
    });
  }

  // 로그아웃·탈퇴 직전에 부른다 — 인증이 살아 있어야 본인 문서를 지울 수 있다(NT-12 삭제).
  // 오래 걸려도 상한 시간 뒤에는 돌아온다(로그아웃을 막지 않는다).
  public unregisterCurrentDevice(): Promise<void> {
    const userId = this.dependencies.login.getUserId();

    if (!userId) {
      return Promise.resolve();
    }

    this.unregisteredUserId = userId;

    // 앞선 작업이 멈춰 있어도 로그아웃을 막지 않게 전체에도 같은 상한을 둔다.
    return this.withTimeout(
      this.enqueue(() => this.runUnregister(userId))
    ).then(() => undefined);
  }

  // 인증 상태가 비워질 때(Firebase.clear) 부른다 — 다음 로그인 사용자가 새로 등록할 수 있게.
  public reset(): void {
    this.lastWrite = null;
    this.unregisteredUserId = null;
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.queue.then(task).catch(error => {
      console.warn('PushTokenRegistrar 작업 실패', error); // l10n-ignore: console 개발자 로그
    });

    this.queue = next;

    return next;
  }

  private async runRegister(refreshedToken: string | null): Promise<void> {
    const { login } = this.dependencies;

    if (!login.isLoggedIn() || !login.hasAgreedToTerms()) {
      return;
    }

    const userId = login.getUserId();

    if (!userId || userId === this.unregisteredUserId) {
      return;
    }

    const permissionGranted = await this.dependencies.isPermissionGranted();
    const stored = await this.loadRegistration();
    const hasRegistration = stored !== null && stored.userId === userId;

    // 권한이 없으면 새로 등록하지 않는다. 이미 등록된 기기면 briefingEnabled=false로 갱신한다(문서는 남긴다).
    if (!permissionGranted && !hasRegistration) {
      return;
    }

    const token = refreshedToken ?? (await this.getToken());

    if (!token) {
      return;
    }

    const tokenId = getPushTokenId(token);
    const briefingEnabled =
      permissionGranted && (await this.dependencies.isBriefingToggleOn());
    const record = this.buildRecord(token, briefingEnabled);
    const writeKey = JSON.stringify([userId, tokenId, record]);
    const now = Date.now();
    const isBriefingChanged =
      hasRegistration && stored.briefingEnabled !== briefingEnabled;

    if (
      !isBriefingChanged &&
      this.lastWrite &&
      this.lastWrite.key === writeKey &&
      now - this.lastWrite.at < SAME_WRITE_DEDUPE_MS
    ) {
      return;
    }

    // 토큰이 바뀌었으면 옛 토큰 문서를 지운다 — 한 기기에 문서 1건.
    if (hasRegistration && stored.tokenId !== tokenId) {
      await this.removeSilently(userId, stored.tokenId);
    }

    await this.dependencies.store.save(userId, tokenId, record);

    this.lastWrite = { key: writeKey, at: now };
    await this.saveRegistration({
      userId,
      tokenId,
      registeredAt: now,
      briefingEnabled,
    });
  }

  // 로그아웃 삭제. 상한 시간 안에 삭제가 실제로 성공했을 때만 등록 기록을 지운다 —
  // 실패·시간 초과면 기록을 남겨 같은 uid의 다음 실행에서 다시 지울 수 있게 한다.
  private async runUnregister(userId: string): Promise<void> {
    this.lastWrite = null;

    const stored = await this.loadRegistration();
    const hasStored = stored !== null && stored.userId === userId;
    // 등록 기록이 없으면 현재 토큰으로 문서 id를 계산해 지운다(최선 노력).
    const tokenId = hasStored
      ? stored.tokenId
      : await this.withTimeout(this.getTokenIdSilently());

    if (!tokenId) {
      return;
    }

    const removed = await this.withTimeout(
      this.dependencies.store.remove(userId, tokenId).then(() => true)
    );

    if (removed !== true) {
      console.warn('PushTokenRegistrar 로그아웃 토큰 문서 삭제 실패·시간 초과'); // l10n-ignore: console 개발자 로그

      return;
    }

    if (hasStored) {
      await this.clearRegistration();
    }
  }

  // 상한 시간(UNREGISTER_TIMEOUT_MS) 안에 끝나지 않거나 실패하면 null. 타이머는 결과가 나면 지운다.
  private async withTimeout<T>(task: Promise<T>): Promise<T | null> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<null>(resolve => {
      timer = setTimeout(() => resolve(null), UNREGISTER_TIMEOUT_MS);
    });

    try {
      return await Promise.race([task, timeout]);
    } catch (error) {
      console.warn('PushTokenRegistrar 로그아웃 작업 실패', error); // l10n-ignore: console 개발자 로그

      return null;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private async getTokenIdSilently(): Promise<string | null> {
    const token = await this.getToken();

    return token ? getPushTokenId(token) : null;
  }

  private async isBriefingChanged(
    stored: StoredRegistration
  ): Promise<boolean> {
    const briefingEnabled =
      (await this.dependencies.isPermissionGranted()) &&
      (await this.dependencies.isBriefingToggleOn());

    return stored.briefingEnabled !== briefingEnabled;
  }

  // DM-34 필드 그대로. 모르는 값은 undefined로 두지 않고 필드째 뺀다.
  private buildRecord(
    token: string,
    briefingEnabled: boolean
  ): PushTokenRecord {
    const locale = this.dependencies.getLocale();
    const appVersion = this.dependencies.getAppVersion();

    return {
      token,
      platform: this.dependencies.platform,
      briefingEnabled,
      ...(locale ? { locale } : {}),
      ...(appVersion ? { appVersion } : {}),
    };
  }

  private async getToken(): Promise<string | null> {
    const messaging = this.dependencies.getMessaging();

    if (!messaging) {
      return null;
    }

    const token = await messaging.getToken();

    return token ? token : null;
  }

  private async removeSilently(userId: string, tokenId: string): Promise<void> {
    try {
      await this.dependencies.store.remove(userId, tokenId);
    } catch (error) {
      console.warn('PushTokenRegistrar 토큰 문서 삭제 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  private async loadRegistration(): Promise<StoredRegistration | null> {
    try {
      const stored = await AsyncStorage.getItem(REGISTRATION_STORAGE_KEY);

      return stored ? parseStoredRegistration(JSON.parse(stored)) : null;
    } catch (error) {
      console.warn('PushTokenRegistrar 등록 기록 로드 실패', error); // l10n-ignore: console 개발자 로그

      return null;
    }
  }

  private async saveRegistration(registration: StoredRegistration) {
    try {
      await AsyncStorage.setItem(
        REGISTRATION_STORAGE_KEY,
        JSON.stringify(registration)
      );
    } catch (error) {
      console.warn('PushTokenRegistrar 등록 기록 저장 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  private async clearRegistration() {
    try {
      await AsyncStorage.removeItem(REGISTRATION_STORAGE_KEY);
    } catch (error) {
      console.warn('PushTokenRegistrar 등록 기록 삭제 실패', error); // l10n-ignore: console 개발자 로그
    }
  }
}

export default PushTokenRegistrar;
