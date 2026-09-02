import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CommunityPostType from '@/model/community/CommunityPostType';
import CommunityWriteMode from '@/model/community-write/CommunityWriteMode';
import CommunityWriteWrapper from '@/components/community/write/CommunityWriteWrapper';

const parseType = (value: string | string[] | undefined): CommunityPostType | null => {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === CommunityPostType.Question) {
    return CommunityPostType.Question;
  }

  if (candidate === CommunityPostType.BagReview) {
    return CommunityPostType.BagReview;
  }

  if (candidate === CommunityPostType.Poll) {
    return CommunityPostType.Poll;
  }

  return null;
};

/**
 * 커뮤니티 신규 글 작성 라우트다(CM-2, CM-3, CM-4, CM-5, CM-6).
 * 이미지 세션은 공개 커뮤니티 Storage 전용이고 개인 장비 사진 경로와 분리된다.
 */
const CommunityWriteRoute = () => {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string | string[] }>();
  const postType = parseType(type);

  useEffect(() => {
    if (!postType) {
      router.back();
    }
  }, [postType, router]);

  if (!postType) {
    return null;
  }

  return (
    <CommunityWriteWrapper
      mode={CommunityWriteMode.Create}
      type={postType}
    />
  );
};

export default CommunityWriteRoute;
