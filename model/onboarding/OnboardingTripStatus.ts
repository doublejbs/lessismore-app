// 첫 여행 가이드 노출 기록(OB-1). 값이 하나라도 저장돼 있으면 다시 띄우지 않는다.
enum OnboardingTripStatus {
  Presented = 'presented',
  Dismissed = 'dismissed',
  Completed = 'completed',
  NotNeeded = 'not_needed',
}

export default OnboardingTripStatus;
