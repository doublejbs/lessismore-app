// 적용 카드 상태(AS-3·AS-5). Pending/Applying만 미결이고 나머지는 결과가 정해진 상태다.
enum AssistantActionStatus {
  Pending = 'pending',
  Applying = 'applying',
  Applied = 'applied',
  Skipped = 'skipped',
  Failed = 'failed',
}

export default AssistantActionStatus;
