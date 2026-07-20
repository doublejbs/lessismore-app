import { BagLocation } from './BagLocation';

// 배낭 상세·여행지 허브 → 공용 여행지 선택기(`/bag-destination-picker`)로 넘길 파라미터의
// 모듈 레벨 핸드오프. 선택기는 RN Modal이 아니라 라우트라(DST-3) 호출 화면의 도메인 객체에
// 직접 닿을 수 없어, 현재 여행지와 저장 콜백을 여기 실어 보낸다.
// (CampSiteFavoritesHandoff·PendingBagLocationHandoff와 동일한 패턴)

export interface BagDestinationPickerParams {
  // 현재 저장된 여행지. 없으면 미설정 상태로 연다.
  currentLocation: BagLocation | null;
  // 확정한 여행지의 저장 책임은 호출 화면에 있다 — 실패 시 던지면 선택기가 열린 채 유지된다(DST-6).
  onConfirm: (location: BagLocation) => Promise<void>;
  // 저장 성공 직후 호출 화면이 이어서 할 일(없어도 된다).
  onDone?: (() => void) | undefined;
}

let pending: BagDestinationPickerParams | null = null;

export const setBagDestinationPicker = (
  params: BagDestinationPickerParams
): void => {
  pending = params;
};

// 소비: 선택기 화면이 마운트 시 1회 읽고 즉시 비운다 — 다음 진입에 이전 배낭의
// 저장 콜백이 잘못 붙지 않게 한다.
export const takeBagDestinationPicker =
  (): BagDestinationPickerParams | null => {
    const params = pending;

    pending = null;

    return params;
  };
