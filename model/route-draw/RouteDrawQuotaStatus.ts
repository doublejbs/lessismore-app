// 무료 기록(DM-36)을 읽은 상태 (RD-8). `Unknown`은 아직 못 읽음(구독 전·오프라인 첫 읽기·실패) — 안전하게 "불가"로 본다.
enum RouteDrawQuotaStatus {
  Unknown = 'unknown',
  Loaded = 'loaded',
}

export default RouteDrawQuotaStatus;
