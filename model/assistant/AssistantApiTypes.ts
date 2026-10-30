import AppLanguage from '../l10n/AppLanguage';
import AssistantProvider from './AssistantProvider';
import AssistantStopReason from './AssistantStopReason';

/**
 * `tripAssistant` 호출 계약(AS-1, 앱 v1 비스트리밍). 서버 담당과 공유하는 형태 그대로다.
 * `history`·`appended`는 공급자 원형이라 앱은 내용을 해석하지 않고 그대로 누적한다(append-only).
 */

// 쓰기 도구 호출 — 앱이 적용 카드로 확인받는다(AS-5).
export interface AssistantPendingAction {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// 다음 요청에 실어 보내는 쓰기 도구 결과.
export interface AssistantToolResult {
  id?: string;
  name: string;
  content: Record<string, unknown>;
  isError: boolean;
}

export interface AssistantRequestContext {
  bagId?: string;
}

export interface AssistantRequest {
  provider?: AssistantProvider;
  history: unknown[];
  userText?: string;
  toolResults?: AssistantToolResult[];
  locale: AppLanguage;
  today: string;
  context: AssistantRequestContext;
}

export interface AssistantResponse {
  provider: AssistantProvider;
  model: string;
  appended: unknown[];
  text: string;
  pendingActions: AssistantPendingAction[];
  remaining: number;
  stopReason: AssistantStopReason;
}
