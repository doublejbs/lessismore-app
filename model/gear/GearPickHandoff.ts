import Gear from './Gear';

// 장비 검색 모달(`/search?pick=…`)의 담기 모드 핸드오프(OB-13). 검색 모달은 라우트라 호출 화면의
// 도메인 객체에 직접 닿을 수 없어, 고른 장비를 돌려받을 콜백을 여기 실어 보낸다
// (BagDestinationPickerHandoff와 같은 패턴). 담기 모드는 창고·배낭에 아무것도 쓰지 않는다.

export interface GearPickParams {
  onPick: (gear: Gear) => void;
  isPicked: (gear: Gear) => boolean;
}

let pending: GearPickParams | null = null;

export const setGearPick = (params: GearPickParams): void => {
  pending = params;
};

// 소비: 검색 모달이 마운트 시 1회 읽고 즉시 비운다 — 다음 진입에 이전 콜백이 붙지 않게 한다.
export const takeGearPick = (): GearPickParams | null => {
  const params = pending;

  pending = null;

  return params;
};
