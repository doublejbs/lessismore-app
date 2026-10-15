// 무료 1회 기록 요청(`claimFreeRouteDraw`, RD-8)의 결과.
enum RouteDrawClaimResult {
  // 이 코스로 무료 1회가 정해졌다(같은 코스 재요청·플러스 사용자 포함). 저장을 이어 간다.
  Claimed = 'claimed',
  // 이미 다른 코스로 무료 1회를 썼다 — 저장을 멈추고 구독 화면을 연다.
  Used = 'used',
  // 호출 실패(네트워크·서버 오류). 저장을 멈추고 다시 시도하게 둔다.
  Failed = 'failed',
}

export default RouteDrawClaimResult;
