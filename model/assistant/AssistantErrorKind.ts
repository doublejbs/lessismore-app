/**
 * 호출 실패를 화면 처리 단위로 접은 값(AS-8). `FirebaseError.code`(`functions/` 접두 제거) 기준.
 * - Network: `unavailable`·`deadline-exceeded`·연결 실패 → `연결이 불안정해요…` + 다시 보내기
 * - Limit: `resource-exhausted` → 한도 카드(AS-9)
 * - ProviderChanged: `failed-precondition` → 새 대화 안내(§6)
 * - Generic: 그 외(`unauthenticated`·`invalid-argument`·`internal`·`not-found` …) → `문제가 생겼어요…`
 */
enum AssistantErrorKind {
  Network = 'network',
  Limit = 'limit',
  ProviderChanged = 'provider_changed',
  Generic = 'generic',
}

export default AssistantErrorKind;
