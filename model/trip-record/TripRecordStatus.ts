// 여행 기록 시트의 진입 상태(CM-16).
enum TripRecordStatus {
  Loading = 'loading',
  // 기록을 쓸 수 있다 — 끝난 내 배낭이고 기록이 아직 없다.
  Ready = 'ready',
  // 이 배낭의 내 기록이 이미 있다(배낭당 1개) — 기존 글로 보낸다.
  Existing = 'existing',
  // 진행 중·예정 여행 — 시트를 열지 않는다.
  NotEnded = 'not_ended',
  // 웹·비로그인·남의 배낭·조회 실패.
  Unavailable = 'unavailable',
}

export default TripRecordStatus;
