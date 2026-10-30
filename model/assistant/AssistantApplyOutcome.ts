import { AssistantTrip } from './AssistantTrip';

/**
 * 쓰기 도구 적용 결과(AS-5). `content`·`message`는 서버(모델)로 가고 `note`는 카드 상태 줄에 쓴다.
 * `trip`은 적용 뒤의 대상 여행 — `여행 만들기`·`여행 정보 변경`이 상단 대상 줄을 바꾼다.
 */
export interface AssistantAppliedOutcome {
  ok: true;
  content: Record<string, unknown>;
  note: string;
  trip: AssistantTrip | null;
  createdBagId: string | null;
}

export interface AssistantFailedOutcome {
  ok: false;
  message: string;
  note: string;
}

export type AssistantApplyOutcome =
  | AssistantAppliedOutcome
  | AssistantFailedOutcome;
