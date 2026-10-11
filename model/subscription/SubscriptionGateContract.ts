// SUB-4·SUB-11: 구독 SDK를 모르는 쪽(광고 서비스·오프라인 저장 게이트)이 보는 구독 상태의 모양.
// `SubscriptionStore`가 구현한다.
export interface SubscriptionGateContract {
  // `premium` 권한이 살아 있는지(7일 무료 체험 포함).
  isSubscribed(): boolean;
  // 구독 상태를 알게 될 때까지(또는 짧은 제한 시간까지) 기다린다. 구독 기능이 꺼져 있으면 바로 끝난다.
  waitUntilResolved(): Promise<void>;
}
