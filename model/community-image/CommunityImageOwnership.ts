/**
 * 커뮤니티 Storage 경로 소유권을 판별한다(CM-6, DM-9, DM-28).
 * 정확한 커뮤니티 경로만 인정해 개인 장비 사진 경로와 다른 사용자의 파일을 분리한다.
 */
const isOwnedPath = (storagePath: string, userId: string): boolean => {
  if (!storagePath || !userId) {
    return false;
  }

  const segments = storagePath.split('/');

  if (segments.length !== 4) {
    return false;
  }

  return (
    segments[0] === 'community' &&
    segments[1] === userId &&
    segments[2].length > 0 &&
    segments[3].length > 4 &&
    segments[3].endsWith('.jpg')
  );
};

const CommunityImageOwnership = {
  isOwnedPath,
};

export default CommunityImageOwnership;
