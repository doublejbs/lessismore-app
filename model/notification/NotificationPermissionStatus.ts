// OS 알림 권한 상태(NT-1·OB-8). expo-notifications `PermissionStatus`와 같은 값 + 웹/모듈 부재.
enum NotificationPermissionStatus {
  Granted = 'granted',
  Denied = 'denied',
  Undetermined = 'undetermined',
  Unavailable = 'unavailable',
}

export default NotificationPermissionStatus;
