import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CommunityPostType from '@/model/community/CommunityPostType';
import CommunityWriteMode from '@/model/community-write/CommunityWriteMode';
import CommunityWriteWrapper from '@/components/community/write/CommunityWriteWrapper';

/**
 * 커뮤니티 게시글 수정 라우트다(CM-9, CM-6, DM-28).
 * 기존 공개 사진도 커뮤니티 경로에서만 관리하며 개인 장비 사진 경로와 분리한다.
 */
const CommunityEditRoute = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!postId) {
      router.back();
    }
  }, [postId, router]);

  if (!postId) {
    return null;
  }

  return (
    <CommunityWriteWrapper
      mode={CommunityWriteMode.Edit}
      type={CommunityPostType.Question}
      postId={postId}
    />
  );
};

export default CommunityEditRoute;
