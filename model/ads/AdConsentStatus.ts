// AD-5: 동의 흐름의 결과. `logClick('ad_consent', { status })`의 값이다.
enum AdConsentStatus {
  // 광고를 요청할 수 있고 iOS 추적도 허용됐다(Android는 ATT가 없어 이 값).
  Granted = 'granted',
  // 광고는 요청할 수 있지만 iOS 추적을 거부했다 — 비맞춤 광고가 나간다.
  TrackingDenied = 'tracking_denied',
  // UMP가 광고 요청을 허락하지 않았다 — 광고를 요청하지 않는다.
  Blocked = 'blocked',
  // 동의 정보 갱신·SDK 초기화가 실패했다.
  Error = 'error',
}

export default AdConsentStatus;
