// OF-2: 배낭 상세 `오프라인` 타일의 상태. 부제·탭 동작이 이 값으로 갈린다.
enum OfflineTripStatus {
  // 저장하지 않았다 — 부제 `오프라인 저장`.
  Unsaved = 'unsaved',
  // 사용자가 시작한 저장·`지금 갱신` 중 — 부제 `저장 중…`.
  Saving = 'saving',
  // 상세 진입 때 도는 자동 갱신 중 — 부제 `오프라인 갱신 중…`(OF-2, 2026-10-12 사용자 결정 "타일에 표시").
  Refreshing = 'refreshing',
  // 저장됨 — 부제 `저장됨 · 1.8MB · 10.09 갱신`.
  Saved = 'saved',
  // 저장본이 옛 스키마 — 부제 `갱신이 필요해요`.
  NeedsUpgrade = 'needsUpgrade',
  // 저장본은 있지만 구독이 끝났다 — 부제 `저장됨 · 구독 후 다시 볼 수 있어요`(OF-7).
  Locked = 'locked',
}

export default OfflineTripStatus;
