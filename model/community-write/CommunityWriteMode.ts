/**
 * 커뮤니티 작성 화면의 동작 모드다(CM-2, CM-3, CM-4, CM-5, CM-6, CM-9).
 * 작성 공개 사진은 개인 장비 사진 경로와 분리된 커뮤니티 Storage 세션을 사용한다.
 */
enum CommunityWriteMode {
  Create = 'create',
  Edit = 'edit',
}

export default CommunityWriteMode;
