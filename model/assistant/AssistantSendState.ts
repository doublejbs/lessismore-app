// 사용자 말풍선의 전송 상태(AS-7). Failed는 `appended`를 받지 못해 기록에 남지 않은 발화다.
enum AssistantSendState {
  Sending = 'sending',
  Sent = 'sent',
  Failed = 'failed',
}

export default AssistantSendState;
