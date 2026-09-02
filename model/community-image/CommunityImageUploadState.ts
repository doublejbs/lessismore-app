/**
 * 커뮤니티 사진 한 장의 업로드 상태다(CM-6, DM-9, DM-28).
 * 공개 사진 상태와 개인 장비 사진 상태는 서로 다른 경로에서 관리한다.
 */
enum CommunityImageUploadState {
  Pending = 'pending',
  Uploading = 'uploading',
  Done = 'done',
  Failed = 'failed',
}

export default CommunityImageUploadState;
