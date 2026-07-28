// 외부 후기(네이버 블로그·유튜브) 공용 타입 — 박지 상세(CS-3)와 장비 상세(GD-6)가 함께 쓴다.

// 블로그 후기 표시용 형태.
export interface BlogReview {
  title: string;
  summary: string; // description에서 HTML 제거한 요약(2줄 노출)
  bloggerName: string;
  postDate: string; // 표시용으로 정규화한 값(YYYY.MM.DD)
  link: string;
}

// 후기 영상(유튜브) 표시용 형태.
export interface VideoReview {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

// Firestore 후기 공유 캐시 문서 (DM-18 camp-spot-review / DM-19 gear-review 공통 형태).
// 7일 TTL — updatedAt이 7일을 넘으면 상세 진입 시 재조회해 갱신한다.
export interface ReviewCache {
  reviews: BlogReview[];
  videos: VideoReview[];
  updatedAt: string; // ISO 8601
  queryVersion?: number; // 결과를 만든 검색·필터 규칙 버전. 없으면 레거시(버전 1 이전) 캐시
}

// 두 소스(네이버 블로그·유튜브) 공통 요청 형태. requiredTokens는 관련성 필터(CS-3) 판정 기준으로,
// 빈 배열이면 필터 없이 후보를 그대로 쓴다.
export interface ReviewSearchRequest {
  query: string;
  requiredTokens: string[];
}

// 후기 캐시 TTL(7일) — DM-18/DM-19 공통 정책.
export const REVIEW_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 검색어·관련성 필터 규칙을 바꾸면 이 값을 올려 기존 캐시를 무효화한다(DM-18).
export const REVIEW_QUERY_VERSION = 1;

// 표시·TTL 판정에 쓸 수 있는 캐시만 통과시킨다(DM-18). 현재 버전보다 **낮을 때만** 만료로 본다 —
// 공유 캐시를 여러 앱 버전이 함께 쓰므로 `불일치 = 만료`로 두면 신·구 버전이 서로의 결과를
// 무효화하며 왕복 재조회를 일으켜 유튜브 쿼터를 태운다. 구버전 앱은 신버전이 담은 더 엄격한
// 결과를 그대로 쓰는 편이 안전하다. 필드가 없는 레거시 문서는 0으로 취급돼 만료된다.
export const getUsableReviewCache = (
  cache: ReviewCache | null
): ReviewCache | null => {
  return (cache?.queryVersion ?? 0) < REVIEW_QUERY_VERSION ? null : cache;
};
