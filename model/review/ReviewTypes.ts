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
}

// 후기 캐시 TTL(7일) — DM-18/DM-19 공통 정책.
export const REVIEW_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
