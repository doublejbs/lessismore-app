import { FirebaseError } from 'firebase/app';
import { Functions, getFunctions, httpsCallable } from 'firebase/functions';
import app from '../app/App';
import { AssistantRequest, AssistantResponse } from './AssistantApiTypes';
import AssistantErrorKind from './AssistantErrorKind';

// 함수 리전·이름(AS-1). 서버 `tripAssistant`(v2 onCall)와 같아야 한다.
const FUNCTIONS_REGION = 'asia-northeast3';
const FUNCTION_NAME = 'tripAssistant';
// 함수 timeoutSeconds(120)와 맞춘다 — SDK 기본 70초면 긴 턴이 앱에서 먼저 끊긴다(AS-8).
const CALL_TIMEOUT_MS = 120_000;

const NETWORK_CODES = new Set(['unavailable', 'deadline-exceeded']);

/**
 * `tripAssistant` callable 래퍼(AS-1·AS-8). 앱 v1은 비스트리밍으로 부른다.
 * Firebase 앱·인증은 `Firebase.initialize()`가 만든 인스턴스를 그대로 쓴다 — 호출에 ID 토큰이 자동으로 붙는다.
 */
class AssistantApi {
  public static new() {
    return new AssistantApi();
  }

  private functions: Functions | null = null;

  private constructor() {}

  public async send(request: AssistantRequest): Promise<AssistantResponse> {
    const callable = httpsCallable<AssistantRequest, AssistantResponse>(
      this.getFunctions(),
      FUNCTION_NAME,
      { timeout: CALL_TIMEOUT_MS }
    );
    const result = await callable(request);

    return result.data;
  }

  /**
   * 실패를 화면 처리 단위로 접는다(AS-8). 연결 실패는 SDK가 HTTP 상태 0을 `internal`(설명도 소문자
   * `internal`)로 돌려주므로, 그 모양이거나 기기가 오프라인이면 네트워크로 본다 — 서버의 처리 안 된
   * 예외는 설명이 대문자 `INTERNAL`이라 구분된다.
   */
  public static toErrorKind(error: unknown, offline: boolean): AssistantErrorKind {
    if (offline) {
      return AssistantErrorKind.Network;
    }

    if (!(error instanceof FirebaseError)) {
      return AssistantErrorKind.Generic;
    }

    const code = error.code.replace(/^functions\//, '');

    if (code === 'resource-exhausted') {
      return AssistantErrorKind.Limit;
    }

    if (code === 'failed-precondition') {
      return AssistantErrorKind.ProviderChanged;
    }

    if (NETWORK_CODES.has(code)) {
      return AssistantErrorKind.Network;
    }

    if (code === 'internal' && error.message === 'internal') {
      return AssistantErrorKind.Network;
    }

    return AssistantErrorKind.Generic;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      this.functions = getFunctions(
        app.getFirebase().getApp(),
        FUNCTIONS_REGION
      );
    }

    return this.functions;
  }
}

export default AssistantApi;
