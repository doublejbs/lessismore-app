import { CampSpot } from './CampSpotTypes';

// 지도 마커 탭 → 박지 요약 시트(`/camp-site-summary`)로 넘길 파라미터의 모듈 레벨 핸드오프.
// 시트는 라우트라 지도의 CampSiteMap 인스턴스에 직접 닿을 수 없어, 대상 박지와 콜백을 넘긴다.
// (CampReviewWriteHandoff·PendingBagLocationHandoff와 동일한 패턴)

export interface CampSiteSummaryParams {
  spot: CampSpot;
  // 위치로 이동(CS-2) — 시트가 떠 있는 채로 지도 카메라를 그 박지로 되돌린다.
  onMoveToSpot: (spot: CampSpot) => void;
  // 시트가 닫힐 때 지도의 마커 선택을 해제한다(강조 정리).
  onClose: () => void;
}

let pending: CampSiteSummaryParams | null = null;

export const setCampSiteSummary = (params: CampSiteSummaryParams): void => {
  pending = params;
};

// 소비: 반환 후 즉시 비워, 다음 진입에 이전 파라미터가 잘못 붙지 않게 한다.
export const takeCampSiteSummary = (): CampSiteSummaryParams | null => {
  const params = pending;

  pending = null;

  return params;
};
