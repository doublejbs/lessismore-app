/**
 * 커뮤니티 사진 파이프라인 오류 코드다(CM-6, DM-9, DM-28).
 * 오류가 발생해도 커뮤니티 사진은 개인 장비 사진 경로와 분리된 경계를 유지한다.
 */
enum CommunityImageError {
  PermissionDenied = 'permission-denied',
  Cancelled = 'cancelled',
  TooLarge = 'too-large',
  UnsupportedType = 'unsupported-type',
  NormalizeFailed = 'normalize-failed',
  UploadFailed = 'upload-failed',
  LimitExceeded = 'limit-exceeded',
  NotLoggedIn = 'not-logged-in',
}

export default CommunityImageError;
