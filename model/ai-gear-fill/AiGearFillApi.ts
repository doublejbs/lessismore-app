import { FirebaseError } from 'firebase/app';
import { Functions, getFunctions, httpsCallable } from 'firebase/functions';
import app from '../app/App';
import AppLanguage from '../l10n/AppLanguage';
import AiGearFillErrorKind from './AiGearFillErrorKind';
import { AiGearFillItemData } from './AiGearFillItem';

// 함수 리전·이름(AS-1). 서버 `tripAssistant`(v2 onCall)와 같아야 한다.
const FUNCTIONS_REGION = 'asia-northeast3';
const FUNCTION_NAME = 'tripAssistant';
const MODE_GEAR_FILL = 'gear_fill';
// 함수 timeoutSeconds(120)와 맞춘다 — SDK 기본 70초면 긴 호출이 앱에서 먼저 끊긴다(AS-8).
const CALL_TIMEOUT_MS = 120_000;

const NETWORK_CODES = new Set(['unavailable', 'deadline-exceeded']);
const LIMIT_CODE = 'resource-exhausted';
// 연결 실패(HTTP 상태 0)는 SDK가 code `internal` + 소문자 message `internal`로 돌려준다.
// 서버의 처리 안 된 예외는 message가 대문자 `INTERNAL`이라 구분된다.
const NETWORK_INTERNAL_CODE = 'internal';
const NETWORK_INTERNAL_MESSAGE = 'internal';

export interface AiGearFillRequest {
  mode: typeof MODE_GEAR_FILL;
  context: { bagId: string };
  locale: AppLanguage;
  today: string;
}

export interface AiGearFillTripData {
  name: string;
  startDate: string;
  endDate: string;
  locationName: string | null;
  weatherLine: string | null;
}

export interface AiGearFillResultData {
  headline: string;
  items: AiGearFillItemData[];
  notes: string[];
  trip: AiGearFillTripData;
}

export interface AiGearFillResponse {
  mode: string;
  provider: string;
  model: string;
  result: AiGearFillResultData | null;
  refused: boolean;
  remaining: number;
}

/**
 * `tripAssistant` 모드 호출 래퍼(AS-1·AS-8) — `gear_fill` 비스트리밍 1회.
 * Firebase 앱·인증은 `Firebase.initialize()`가 만든 인스턴스를 그대로 쓴다(호출에 ID 토큰이 자동으로 붙는다).
 */
class AiGearFillApi {
  public static new() {
    return new AiGearFillApi();
  }

  private functions: Functions | null = null;

  private constructor() {}

  public async request(
    bagId: string,
    locale: AppLanguage,
    today: string
  ): Promise<AiGearFillResponse> {
    const callable = httpsCallable<AiGearFillRequest, AiGearFillResponse>(
      this.getFunctions(),
      FUNCTION_NAME,
      { timeout: CALL_TIMEOUT_MS }
    );
    const result = await callable({
      mode: MODE_GEAR_FILL,
      context: { bagId },
      locale,
      today,
    });

    return result.data;
  }

  /**
   * 실패를 화면 처리 단위로 접는다(AS-8). `refused`·`result: null`은 오류가 아니라 응답이라
   * 여기로 오지 않는다(호출자가 `Refused`로 처리).
   */
  public static toErrorKind(error: unknown): AiGearFillErrorKind {
    if (!(error instanceof FirebaseError)) {
      return AiGearFillErrorKind.Generic;
    }

    const code = error.code.replace(/^functions\//, '');

    if (code === LIMIT_CODE) {
      return AiGearFillErrorKind.Limit;
    }

    if (NETWORK_CODES.has(code)) {
      return AiGearFillErrorKind.Network;
    }

    if (
      code === NETWORK_INTERNAL_CODE &&
      error.message === NETWORK_INTERNAL_MESSAGE
    ) {
      return AiGearFillErrorKind.Network;
    }

    return AiGearFillErrorKind.Generic;
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

export default AiGearFillApi;
