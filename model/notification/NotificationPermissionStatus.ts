// OS 알림 권한 상태(NT-1·OB-8). expo-notifications `PermissionStatus`와 같은 값 + 웹/모듈 부재.
// Provisional은 iOS 임시 허용(NT-13) — 응답의 `ios.status === 3`(IosAuthorizationStatus.PROVISIONAL)으로
// 판정한다(expo-notifications 57은 이때 granted:false·status:'undetermined'를 돌려준다).
// 대화상자를 본 적 없는 상태라 예약·토픽·토큰 등록은 허용으로, '물을지' 판정은 미결정으로 다룬다.
enum NotificationPermissionStatus {
  Granted = 'granted',
  Provisional = 'provisional',
  Denied = 'denied',
  Undetermined = 'undetermined',
  Unavailable = 'unavailable',
}

export default NotificationPermissionStatus;
