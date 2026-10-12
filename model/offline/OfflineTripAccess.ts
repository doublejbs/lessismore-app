// OF-5·OF-7: 오프라인에서 저장본을 열 수 있는지. 온라인이면 늘 `Online`(서버 데이터를 쓴다 — OF-3).
enum OfflineTripAccess {
  // 연결이 있다 — 저장본이 아니라 서버 데이터를 쓴다.
  Online = 'online',
  // 오프라인 + 저장본 있음 + 권한 살아 있음 → 저장본으로 연다.
  Available = 'available',
  // 오프라인인데 이 여행을 저장하지 않았다(`이 여행은 저장되지 않았어요`).
  NotSaved = 'notSaved',
  // 저장본은 있지만 구독이 끝났다(OF-7) — 저장본은 지우지 않고 열지 않는다.
  Locked = 'locked',
  // 저장본이 옛 스키마다(OF-1 `갱신 필요`) — 온라인에서 갱신해야 열린다.
  NeedsUpgrade = 'needsUpgrade',
}

export default OfflineTripAccess;
