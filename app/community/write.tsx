import CommunityWriteMode from '@/model/community-write/CommunityWriteMode';
import CommunityWriteWrapper from '@/components/community/write/CommunityWriteWrapper';

/**
 * 커뮤니티 신규 글 작성 라우트다(CM-2, CM-3, CM-4, CM-5, CM-6).
 * 이미지 세션은 공개 커뮤니티 Storage 전용이고 개인 장비 사진 경로와 분리된다.
 */
const CommunityWriteRoute = () => {
  return (
    <CommunityWriteWrapper
      mode={CommunityWriteMode.Create}
    />
  );
};

export default CommunityWriteRoute;
