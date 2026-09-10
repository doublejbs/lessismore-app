/**
 * 작성 폼 오류가 표시될 필드다(CM-2, CM-3, CM-4, CM-5, CM-9).
 * 폼 상태와 커뮤니티 공개 사진 상태는 개인 장비 사진 경로와 분리한다.
 */
enum CommunityWriteField {
  Title = 'title',
  Body = 'body',
  Bag = 'bag',
  PollOptions = 'pollOptions',
}

export default CommunityWriteField;
