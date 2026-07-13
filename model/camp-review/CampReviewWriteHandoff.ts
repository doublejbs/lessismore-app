import { CampReview } from './CampReviewTypes';

// 박지 후기 작성/수정 화면(`/camp-review-write`)으로 넘길 파라미터의 모듈 레벨 핸드오프.
// 상세(CS-8)에서 '후기 쓰기/수정'으로 진입할 때 대상 박지·기존 후기·완료 콜백을 넘기고,
// camp-review-write가 마운트 시 1회 소비한다. (PendingBagLocationHandoff와 동일한 패턴)

export interface CampReviewWriteParams {
  spotId: string;
  spotName: string;
  existing: CampReview | null; // 수정 시 프리필
  onComplete: () => void; // 저장/삭제 후 상세가 후기 리스트를 새로고침
}

let pending: CampReviewWriteParams | null = null;

export const setCampReviewWrite = (params: CampReviewWriteParams): void => {
  pending = params;
};

// 소비: 반환 후 즉시 비워, 다음 진입에 이전 파라미터가 잘못 붙지 않게 한다.
export const takeCampReviewWrite = (): CampReviewWriteParams | null => {
  const p = pending;

  pending = null;

  return p;
};
