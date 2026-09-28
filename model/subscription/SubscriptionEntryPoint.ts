// SUB-8·SUB-9: 구독 화면을 연 자리(`subscription_open`의 `from` 값과 같다).
enum SubscriptionEntryPoint {
  // 설정(정보 탭) `광고 제거` 행.
  Settings = 'settings',
  // 한 장짜리 광고(홈·장비 상세) 아래 `광고 없이 보기` 링크.
  AdCard = 'ad_card',
  // 광고 누적 노출 뒤 한 번 뜨는 안내 시트의 `구독 알아보기`.
  Nudge = 'nudge',
}

export default SubscriptionEntryPoint;
