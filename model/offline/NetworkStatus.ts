import { makeAutoObservable } from 'mobx';
import { Platform } from 'react-native';
import { loadNetInfo } from './NetInfoModule';

// 앱 시작 때 첫 연결 상태를 기다리는 상한(ms). 넘기면 모르는 상태(온라인 취급)로 시작한다.
const INITIAL_FETCH_TIMEOUT_MS = 1500;

// Firestore가 "연결 없음"으로 실패할 때의 코드(`unavailable`)와 메시지 조각(JS SDK `client is offline`).
const FIRESTORE_UNAVAILABLE_CODE = 'unavailable';
const FIRESTORE_OFFLINE_MESSAGE = 'client is offline';

interface NetInfoSnapshot {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

/**
 * 연결 상태의 단일 소스 (OF-3). 화면은 이 값을 **읽기만** 한다.
 *
 * 오프라인 판정:
 * - `isConnected === false`(비행기 모드·셀룰러 끔) → 오프라인.
 * - `isInternetReachable === false`(연결은 있으나 인터넷이 안 닿음) → 오프라인.
 * - `isInternetReachable === null`(아직 모름)이면서 **Firestore 첫 읽기가 연결 없음으로 실패**했으면 → 오프라인.
 *   그 실패는 호출자가 `markFirestoreFailure(error)`로 알린다(로그인 확인·배낭 상세 로드).
 *   이후 netinfo가 도달 가능(`true`)을 알리거나 읽기가 성공하면(`markFirestoreSuccess`) 풀린다.
 *
 * "오프라인"은 연결 없음이지 구독 아님이 아니다(OF-3) — 구독은 `OfflineEntitlement`가 따로 본다.
 * 웹·옛 바이너리(netinfo 네이티브 모듈 없음)에서는 감지하지 않는다(늘 온라인).
 */
class NetworkStatus {
  public static new() {
    return new NetworkStatus();
  }

  private connected: boolean | null = null;
  private internetReachable: boolean | null = null;
  private firestoreFailed = false;
  private started = false;

  private constructor() {
    makeAutoObservable<NetworkStatus, 'started'>(this, { started: false });
  }

  // 감지를 쓸 수 있는지(네이티브 + netinfo 모듈 있음). 오프라인 저장 타일·배너는 이 값이 false면 그리지 않는다.
  public isSupported(): boolean {
    return Platform.OS !== 'web' && loadNetInfo() !== null;
  }

  // `App.initialize`가 Firebase보다 **먼저** 부른다 — 로그인 확인이 오프라인이면 Firestore를 건너뛰어야 한다.
  public async initialize(): Promise<void> {
    const netInfo = this.isSupported() ? loadNetInfo() : null;

    if (!netInfo || this.started) {
      return;
    }

    this.started = true;
    netInfo.addEventListener(state => {
      this.apply(state);
    });

    try {
      const state = await Promise.race([
        netInfo.fetch(),
        new Promise<null>(resolve => {
          setTimeout(() => {
            resolve(null);
          }, INITIAL_FETCH_TIMEOUT_MS);
        }),
      ]);

      if (state) {
        this.apply(state);
      }
    } catch {
      // 상태를 못 읽으면 모르는 상태로 둔다(온라인 취급) — 오프라인을 잘못 단정하는 것보다 낫다.
    }
  }

  public isOffline(): boolean {
    if (this.connected === false || this.internetReachable === false) {
      return true;
    }

    return this.internetReachable === null && this.firestoreFailed;
  }

  public isOnline(): boolean {
    return !this.isOffline();
  }

  /**
   * 기기 연결 자체가 없는지(`isConnected === false` — 비행기 모드·셀룰러 끔)만 본다. AI 액션(AS-8)은
   * 이 값으로만 호출을 막는다 — 도달 가능성(`isInternetReachable`)이나 Firestore 실패 추정으로
   * 막으면, 잘못된 판정 때문에 호출 자체를 못 하게 된다. 연결이 있는데 실패하면 에러로 보여 준다.
   */
  public isDisconnected(): boolean {
    return this.connected === false;
  }

  /**
   * Firestore 읽기 실패를 알린다(OF-3 "null이면서 Firestore 첫 읽기 실패"). 연결 없음 오류일 때만
   * 표시하고 true를 돌려준다 — 권한 오류 같은 다른 실패로 오프라인 화면이 뜨면 안 된다.
   */
  public markFirestoreFailure(error: unknown): boolean {
    // 감지를 쓰지 않는 환경(웹·옛 바이너리)에는 저장본이 없다 — 오프라인 화면으로 바꾸지 않는다.
    if (!this.isSupported() || !NetworkStatus.isUnavailableError(error)) {
      return false;
    }

    this.firestoreFailed = true;

    return true;
  }

  public markFirestoreSuccess(): void {
    this.firestoreFailed = false;
  }

  public static isUnavailableError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const { code, message } = error as { code?: unknown; message?: unknown };

    if (code === FIRESTORE_UNAVAILABLE_CODE) {
      return true;
    }

    return (
      typeof message === 'string' &&
      message.toLowerCase().includes(FIRESTORE_OFFLINE_MESSAGE)
    );
  }

  private apply(state: NetInfoSnapshot) {
    this.connected = state.isConnected;
    this.internetReachable = state.isInternetReachable;

    if (state.isInternetReachable === true) {
      this.firestoreFailed = false;
    }
  }
}

export default NetworkStatus;
