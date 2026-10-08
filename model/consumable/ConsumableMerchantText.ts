import ConsumableMerchant from './ConsumableMerchant';

// 쇼핑몰별 출처 라벨 키(카드 메타 줄·접근성 라벨). 키를 문자열로 조립하지 않아 키 검색에 걸린다.
export const CONSUMABLE_MERCHANT_SOURCE_KEY: Record<ConsumableMerchant, string> = {
  [ConsumableMerchant.Coupang]: 'consumable.source.coupang',
  [ConsumableMerchant.Naver]: 'consumable.source.naver',
};

// 쇼핑몰별 제휴 수수료 고지 키(CP-3). 고지는 이 순서대로 쌓는다.
export const COMMERCE_DISCLAIMER_KEY: Record<ConsumableMerchant, string> = {
  [ConsumableMerchant.Coupang]: 'commerce.coupangDisclaimer',
  [ConsumableMerchant.Naver]: 'commerce.naverConnectDisclaimer',
};

// 자리에 실제로 보이는 상품의 쇼핑몰 집합 — 고지를 정해진 순서(쿠팡 → 네이버)로 한 번씩만 붙인다.
export const getDistinctMerchants = (
  merchants: readonly ConsumableMerchant[]
): ConsumableMerchant[] => {
  const present = new Set(merchants);

  return Object.values(ConsumableMerchant).filter(merchant =>
    present.has(merchant)
  );
};
