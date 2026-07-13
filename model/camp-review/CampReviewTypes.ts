// 박지 유저 후기 데이터 타입 (CampSite CS-8, DataModel DM-20).

// 후기 문서 `camp-spot-user-review/{spotId}/reviews/{userId}` (문서 id == authorId).
export interface CampReview {
  authorId: string;
  authorName: string;
  rating: number;
  content?: string;
  bagId?: string;
  bagName?: string;
  bagDate?: string;
  bagWeight?: string;
  createdAt: string;
  updatedAt: string;
}

// 요약 문서 `camp-spot-user-review/{spotId}` — 별점 집계(트랜잭션으로 동기 갱신).
export interface CampReviewSummary {
  spotId: string;
  reviewCount: number;
  ratingSum: number;
  ratingAvg: number;
  updatedAt: string;
}

// 저장 입력(작성/수정 공용). id·시각·집계는 스토어가 채운다.
export interface CampReviewInput {
  authorName: string;
  rating: number;
  content?: string;
  bagId?: string;
  bagName?: string;
  bagDate?: string;
  bagWeight?: string;
}
