// 여행 상태(BagDetail BD-1 상황 라벨). 오늘 기준 출발 전 / 여행 중 / 지난 여행.
enum TripPhase {
  Before = 'before',
  Ongoing = 'ongoing',
  After = 'after',
}

export default TripPhase;
