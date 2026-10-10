// 여행 기록 게시 후 배낭 상세에 띄울 완료 카드(CM-16)의 모듈 레벨 핸드오프.
// 기록 시트가 닫히기 직전에 넣고, 배낭 상세가 포커스될 때 그 배낭 것만 1회 소비한다.
// (CampReviewWriteHandoff와 같은 패턴)

export interface TripRecordDone {
  bagId: string;
  postId: string;
}

let pending: TripRecordDone | null = null;

export const setTripRecordDone = (value: TripRecordDone): void => {
  pending = value;
};

// 시트가 게시 중에 사라져 화면을 옮기지 않을 때 남은 카드를 지운다.
export const clearTripRecordDone = (): void => {
  pending = null;
};

// 소비하지 않고 이 배낭 것이 남아 있는지만 본다 — 카드를 실제로 띄울 때 take한다.
export const peekTripRecordDone = (bagId: string): boolean => {
  return pending !== null && pending.bagId === bagId;
};

// 다른 배낭 상세가 먼저 포커스되면 소비하지 않고 남겨 둔다.
export const takeTripRecordDone = (bagId: string): TripRecordDone | null => {
  if (!pending || pending.bagId !== bagId) {
    return null;
  }

  const value = pending;

  pending = null;

  return value;
};
