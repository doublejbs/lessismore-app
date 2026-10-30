// 시트 에러 종류(AS-8). 값은 분석 `ai_gear_fill_error.kind`(AS-11)와 같다 — `offline`은 호출 전 차단이라 계측하지 않는다.
enum AiGearFillErrorKind {
  Network = 'network',
  Limit = 'limit',
  Refused = 'refused',
  Generic = 'generic',
  Offline = 'offline',
}

export default AiGearFillErrorKind;
