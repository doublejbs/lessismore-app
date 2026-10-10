// 여행 기록 시트로 들어온 곳(CM-16). `Direct` 외 값은 `click_trip_record_open`의 `source` 값과 같다.
enum TripRecordEntrySource {
  Notification = 'notification',
  BagDetail = 'bag_detail',
  Home = 'home',
  // 진입처 파라미터가 없거나 모르는 값(딥링크 직접 진입 등) — 스펙 enum에 없어 측정하지 않는다.
  Direct = 'direct',
}

export default TripRecordEntrySource;
