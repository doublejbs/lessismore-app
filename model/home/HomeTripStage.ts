// HM-1 다가오는 일정 카드의 시점 구분. D-day·카드 선정·패킹 진행 표시가 이 값을 사용한다.
enum HomeTripStage {
  // D-2 이상 — 아직 담을 시간이 있다.
  Planning = 'planning',
  // D-1 ~ 출발 당일 — 짐을 쌀 때다.
  Imminent = 'imminent',
  // 시작일 ~ 종료일 — 여행 중.
  Ongoing = 'ongoing',
  // 종료 후 7일 이내 & 사용 기록 없음 — 기록을 남길 때다.
  JustFinished = 'just_finished',
}

export default HomeTripStage;
