// MAP-7 한도 폴백: 위성 타일 한 장을 미리 받아 본 결과.
enum SatelliteProbeResult {
  // 이미지가 왔다 — 위성을 쓸 수 있다.
  Ok = 'ok',
  // 권한 오류(401·403·498·499 또는 Esri 오류 응답) — 키 한도 초과·키 문제. 세션 동안 위성을 끈다.
  Unauthorized = 'unauthorized',
  // 네트워크·서버 오류 등 권한과 무관한 실패 — 막지 않는다(타일이 안 오면 빈칸일 뿐이다).
  Failed = 'failed',
}

export default SatelliteProbeResult;
