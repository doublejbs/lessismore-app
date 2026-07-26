import BagDetail from '@/model/bag-detail/BagDetail';

// 필름 카드 화면(`/bag-film-card`)용 모듈 레벨 핸드오프.
// 카드에 얹는 값(무게·날짜·운동 요약·여행지)은 이미 배낭 상세가 로드해 둔 BagDetail
// 인스턴스에 있고, 이 화면 때문에 배낭·건강 데이터를 다시 조회하지 않는다(BS-4).
// MobX 인스턴스는 라우트 param으로 넘길 수 없어 트리거가 router.push 직전 여기에 넣는다.
// (BagShareHandoff·BagInfoEditHandoff와 동일한 패턴)

let currentBagDetail: BagDetail | null = null;

export const setBagFilmCardContext = (bagDetail: BagDetail) => {
  currentBagDetail = bagDetail;
};

export const getBagFilmCardContext = (): BagDetail | null => {
  return currentBagDetail;
};

export const clearBagFilmCardContext = () => {
  currentBagDetail = null;
};
