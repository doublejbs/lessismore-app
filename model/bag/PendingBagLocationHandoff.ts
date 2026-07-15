import { BagLocation } from '../bag-destination/BagLocation';

// 배낭 생성(`/bag-new`) 완료 후 새 배낭에 붙일 여행지 위치의 모듈 레벨 핸드오프.
// 박지 상세(CS-5)에서 '새 배낭 만들기'로 진입할 때 좌표를 넘기고, bag-new가 생성 직후 소비한다.
// (정렬 시트 SortSheetHandoff 등과 동일한 패턴)

let pendingLocation: BagLocation | null = null;

export const setPendingBagLocation = (location: BagLocation) => {
  pendingLocation = location;
};

// 소비: 반환 후 즉시 비워, 다음 일반 배낭 생성에 위치가 잘못 붙지 않게 한다.
export const takePendingBagLocation = (): BagLocation | null => {
  const location = pendingLocation;

  pendingLocation = null;

  return location;
};

export const clearPendingBagLocation = () => {
  pendingLocation = null;
};
