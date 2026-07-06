// 배낭 상세 패킹 플로팅 버튼의 상태 (PK-1 라벨 분기).
enum PackingButtonState {
  None = 'none', // 패킹 기록 없음 → `패킹 시작`
  InProgress = 'in_progress', // 진행 중(챙긴 장비 1개 이상, 미완료) → `패킹 {n}/{m}`
  Completed = 'completed', // 완료(packingCompletedAt 존재) → `패킹 완료`
}

export default PackingButtonState;
