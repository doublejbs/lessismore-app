// SUB-8·SUB-9: 한 번 뜨는 안내의 결과(`subscription_nudge`의 `action` 값과 같다).
enum SubscriptionNudgeAction {
  Shown = 'shown',
  // `구독 알아보기`를 눌렀다 — 시트가 내려간 뒤 구독 화면으로(비로그인이면 로그인으로).
  Open = 'open',
  // `괜찮아요`·스와이프·바깥 탭·안드로이드 뒤로가기로 닫았다.
  Dismiss = 'dismiss',
}

export default SubscriptionNudgeAction;
