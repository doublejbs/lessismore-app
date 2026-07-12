import BagDetail from './BagDetail';

// 배낭 공유 formSheet(`/bag-share`)용 모듈 레벨 핸드오프.
// 공유 상태(공유 중/링크)는 BagDetail(MobX 인스턴스, 뷰 스코프)에 있어 라우트 param으로
// 넘길 수 없으므로, 트리거가 router.push 직전 인스턴스를 이 모듈에 넣고 라우트가 관찰한다.
// (배낭 정보 수정 BagInfoEditHandoff와 동일한 패턴)

let currentBagDetail: BagDetail | null = null;

export const setBagShareContext = (bagDetail: BagDetail) => {
  currentBagDetail = bagDetail;
};

export const getBagShareContext = (): BagDetail | null => {
  return currentBagDetail;
};

export const clearBagShareContext = () => {
  currentBagDetail = null;
};
