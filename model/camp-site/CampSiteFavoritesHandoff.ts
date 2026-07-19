import { CampSpot } from './CampSpotTypes';

// 지도 ★ 칩 탭 → 즐겨찾기 리스트 시트(`/camp-site-favorites`)로 넘길 파라미터의 모듈 레벨 핸드오프.
// 시트는 라우트라 지도의 CampSiteMap 인스턴스에 직접 닿을 수 없어, 콜백을 넘긴다(CS-9).
// (CampSiteDetailSheetHandoff와 동일한 패턴)

export interface CampSiteFavoritesSheetParams {
  // 즐겨찾기 목록은 로드가 진행되며 늘어날 수 있어, 배열이 아니라 지연 조회 함수로 넘긴다.
  // 시트 화면은 observer라 이 함수를 렌더에서 호출해 즐겨찾기 변화에 반응한다.
  getSpots: () => CampSpot[];
  // 항목 탭 — 지도 탭은 시트를 유지한 채 카메라 이동 + 최소 높이로 축소(CS-9).
  onSelect: (spot: CampSpot) => void;
  // 시트가 완전히 닫힐 때 즐겨찾기 전용 마커 필터를 해제한다.
  onClose: () => void;
}

let pending: CampSiteFavoritesSheetParams | null = null;

// 열려 있는 즐겨찾기 시트 수. 리스트 항목 탭 시 시트를 20%로 낮추려 다른 라우트로
// router.replace 하는데, 이때 새 시트의 mount가 기존 시트의 unmount보다 먼저 일어날 수 있다.
// 카운터로 세면 교체 도중 openCount가 0으로 떨어지지 않아, onClose(필터 해제)가
// 마지막 시트가 실제로 닫힐 때만 1회 호출된다. (CampSiteDetailSheetHandoff와 동일한 이유)
let openCount = 0;

export const setCampSiteFavoritesSheet = (
  params: CampSiteFavoritesSheetParams
): void => {
  pending = params;
};

export const markCampSiteFavoritesSheetOpened = (): void => {
  openCount += 1;
};

export const markCampSiteFavoritesSheetClosed = (): void => {
  openCount = Math.max(0, openCount - 1);
};

export const isCampSiteFavoritesSheetOpen = (): boolean => openCount > 0;

// 조회: 상세 핸드오프와 달리 비우지 않는다 — 20% 축소용 router.replace로 새로 마운트되는
// 시트 화면이 같은 파라미터를 다시 읽어야 하기 때문. 다음 진입 시 set으로 덮어쓰므로 누수는 없다.
export const takeCampSiteFavoritesSheet =
  (): CampSiteFavoritesSheetParams | null => pending;
