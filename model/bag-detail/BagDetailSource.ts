// OF-5: 배낭 상세가 지금 무엇으로 그려졌는지.
enum BagDetailSource {
  // 서버(Firestore) 데이터 — 온라인의 평소 상세.
  Server = 'server',
  // 기기에 저장해 둔 스냅샷 — 오프라인 상세(읽기 + 패킹 체크).
  Snapshot = 'snapshot',
  // 오프라인인데 열 수 있는 저장본이 없다(미저장·구독 만료·갱신 필요) — 빈 상태를 그린다.
  Unavailable = 'unavailable',
}

export default BagDetailSource;
