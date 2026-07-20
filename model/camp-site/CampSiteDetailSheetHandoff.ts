import { CampSpot } from './CampSpotTypes';

// 지도 마커 탭 → 박지 상세 시트(`/camp-site/{id}`)로 넘길 파라미터의 모듈 레벨 핸드오프.
// 시트는 라우트라 지도의 CampSiteMap 인스턴스에 직접 닿을 수 없어, 콜백을 넘긴다.
// 박지 자체는 라우트 파라미터(`{id}`)로 전달되므로 여기에 담지 않는다.
// (CampReviewWriteHandoff·PendingBagLocationHandoff와 동일한 패턴)

export interface CampSiteDetailSheetParams {
  // 위치로 이동(CS-2) — 시트가 떠 있는 채로 지도 카메라를 그 박지로 되돌린다.
  onMoveToSpot: (spot: CampSpot) => void;
  // 시트가 닫힐 때 지도의 마커 선택을 해제한다(강조 정리).
  onClose: () => void;
  // `배낭 여행지로 설정` CTA의 동작 오버라이드(DST-3). 여행지 선택기 위에 겹쳐 뜬 상세는
  // 이미 특정 배낭의 선택기 안이라 배낭 리스트(CS-5)를 열 이유가 없어, 이 콜백으로 그 박지를
  // 곧바로 현재 배낭 여행지로 저장한다. 없으면(지도 탭 진입) 기존대로 배낭 선택 시트를 연다.
  // 저장이 끝날 때까지 CTA가 로딩 상태를 보여줄 수 있도록 Promise를 돌려준다(DST-3).
  onSetBag?: ((spot: CampSpot) => Promise<void>) | undefined;
}

let pending: CampSiteDetailSheetParams | null = null;

// 열려 있는 상세 시트 수. 시트는 항상 1개여야 하므로(CS-2) 지도가 이 값을 보고
// 새 시트를 열기 전에 기존 시트를 닫는다. boolean이 아니라 카운터인 이유:
// 닫기와 열기가 겹칠 때 새 시트의 mount가 기존 시트의 unmount보다 먼저 일어날 수 있어,
// boolean이면 "닫힘"으로 잘못 남아 다음 탭에서 다시 쌓이게 된다.
let openCount = 0;

export const setCampSiteDetailSheet = (
  params: CampSiteDetailSheetParams
): void => {
  pending = params;
};

export const markCampSiteDetailSheetOpened = (): void => {
  openCount += 1;
};

export const markCampSiteDetailSheetClosed = (): void => {
  openCount = Math.max(0, openCount - 1);
};

export const isCampSiteDetailSheetOpen = (): boolean => openCount > 0;

// 소비: 반환 후 즉시 비워, 다음 진입에 이전 파라미터가 잘못 붙지 않게 한다.
export const takeCampSiteDetailSheet = (): CampSiteDetailSheetParams | null => {
  const params = pending;

  pending = null;

  return params;
};
