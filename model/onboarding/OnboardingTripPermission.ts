// 완료 단계의 알림 권한 결과(OB-9 `notification` 파라미터).
enum OnboardingTripPermission {
  Granted = 'granted',
  Denied = 'denied',
  // 권한이 미결정이었지만 `알림 없이 만들기`로 묻지 않음.
  Skipped = 'skipped',
  // 이미 허용·거부가 정해져 있어 묻지 않음.
  Already = 'already',
  // 웹 등 알림이 없는 환경.
  Unavailable = 'unavailable',
}

export default OnboardingTripPermission;
