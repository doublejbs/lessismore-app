/**
 * 연결된 운동 상세(HA-4)의 기기 조회 상태.
 *
 * 화면 단계(`BagActivityPhase`)와 별개로 둔다 — 상세 화면은 Firestore에 저장된
 * 요약 스냅샷(DM-22)만으로도 성립하고, 기기 건강 허브 조회는 그 위에 얹히는
 * 부가 정보이기 때문이다. 조회가 실패해도 화면을 막지 않고 요약만 남긴다(HA-5).
 */
enum BagActivityDetailStatus {
  /** 기기에서 운동·경로·심박을 읽는 중 */
  Loading = 'loading',
  /** 상세를 읽었다 — 경로·그래프는 각 운동에 데이터가 있을 때만 그린다 */
  Ready = 'ready',
  /**
   * 기기에서 상세를 읽지 못했다.
   * 권한 회수·기기 변경·허브에서 원본 삭제 어느 쪽인지 구분할 수 없다(HA-2).
   */
  Unavailable = 'unavailable',
}

export default BagActivityDetailStatus;
