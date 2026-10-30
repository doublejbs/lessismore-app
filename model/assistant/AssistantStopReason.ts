// 서버 응답의 턴 종료 사유(AS-1).
enum AssistantStopReason {
  End = 'end',
  ToolUse = 'tool_use',
  Refusal = 'refusal',
  MaxTokens = 'max_tokens',
}

export default AssistantStopReason;
