// 입력 바 자리를 대신하는 상태(AS-7·AS-9·§6). None이면 입력 바를 그린다.
enum AssistantBlockState {
  None = 'none',
  Offline = 'offline',
  Limit = 'limit',
  TurnLimit = 'turn_limit',
  ProviderChanged = 'provider_changed',
}

export default AssistantBlockState;
