// 알림 유형(NT-10). 로컬 알림 data.type과 `notification_open` 이벤트의 type 파라미터 값이다.
enum NotificationType {
  Packing = 'packing',
  Useless = 'useless',
  NextTrip = 'next_trip',
  WeekendCamp = 'weekend_camp',
  // 주말 날씨 브리핑(NT-11 원격) — 서버 페이로드 data.type 값이다.
  WeekendBriefing = 'weekend_briefing',
  Notice = 'notice',
  Unknown = 'unknown',
}

export default NotificationType;
