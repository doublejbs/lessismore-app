// 홈 추천 박지에서 지도 탭으로 넘기는 일회성 선택 대상(HM-11, CS-2).
let pendingSpotId: string | null = null;

export const setPendingCampSite = (spotId: string): void => {
  pendingSpotId = spotId;
};

export const getPendingCampSite = (): string | null => {
  return pendingSpotId;
};

export const clearPendingCampSite = (): void => {
  pendingSpotId = null;
};
