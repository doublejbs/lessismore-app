// SUB-4: 광고 서비스가 보는 구독 상태의 모양. `SubscriptionStore`가 구현한다 —
// 광고 쪽은 구독 SDK를 모른다.
export interface SubscriptionGateContract {
  // 광고 제거 권한이 살아 있는지.
  isSubscribed(): boolean;
  // 구독 상태를 알게 될 때까지(또는 짧은 제한 시간까지) 기다린다. 구독 기능이 꺼져 있으면 바로 끝난다.
  waitUntilResolved(): Promise<void>;
}
