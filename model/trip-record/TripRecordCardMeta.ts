import CommunityPost from '@/model/community/CommunityPost';

/**
 * 여행 기록 카드 메타 줄의 조각(HM-17·CS-11). `numeric`인 조각만 콘덴스드로 갈아 끼운다
 * (숫자·라틴 전용 서체 — 한글이 섞인 박지명·닉네임은 Pretendard로 둔다).
 */
export interface TripRecordMetaPart {
  text: string;
  numeric: boolean;
}

const formatWeight = (grams: number): string => {
  return `${Number((grams / 1000).toFixed(2))}kg`;
};

const getWeightPart = (post: CommunityPost): TripRecordMetaPart[] => {
  const snapshot = post.getBagSnapshot();

  return snapshot
    ? [{ text: formatWeight(snapshot.totalWeight), numeric: true }]
    : [];
};

const getAuthorPart = (post: CommunityPost): TripRecordMetaPart[] => {
  const name = post.getAuthorName();

  return name ? [{ text: name, numeric: false }] : [];
};

// 홈(HM-17): `{박지명 또는 여행지} · {총무게}kg · {닉네임}`.
export const getHomeTripRecordMeta = (
  post: CommunityPost
): TripRecordMetaPart[] => {
  const place = post.getBagSnapshot()?.destinationName;

  return [
    ...(place ? [{ text: place, numeric: false }] : []),
    ...getWeightPart(post),
    ...getAuthorPart(post),
  ];
};

// 박지 상세(CS-11): `YYYY.MM.DD · {총무게}kg · {닉네임}` — 박지명은 화면이 이미 말한다.
export const getSpotTripRecordMeta = (
  post: CommunityPost
): TripRecordMetaPart[] => {
  const startDate = post.getBagSnapshot()?.startDate;

  return [
    ...(startDate
      ? [{ text: startDate.replaceAll('-', '.'), numeric: true }]
      : []),
    ...getWeightPart(post),
    ...getAuthorPart(post),
  ];
};
