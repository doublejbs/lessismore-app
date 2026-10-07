import ConsumableCategory from './ConsumableCategory';
import ConsumableMerchant from './ConsumableMerchant';
import ConsumableSurface from './ConsumableSurface';

// `consumable-product/{id}` 문서(DataModel DM-32). 가격 필드는 두지 않는다(CP-1).
export interface ConsumableProduct {
  // 문서 id — 쿠팡은 productId, 네이버는 `naver-<상품번호>`
  id: string;
  name: string;
  pitch: string;
  category: ConsumableCategory;
  // 제휴 쇼핑몰. 카드 메타 라벨·고지·애널리틱스가 이 값으로 갈린다.
  merchant: ConsumableMerchant;
  // 제휴 링크 — 쿠팡 파트너스 단축 링크 또는 네이버 쇼핑 커넥트 링크
  linkUrl: string;
  // 쇼핑몰 CDN 상품 이미지(https). 없으면 카드가 아이콘으로 폴백한다(CP-2).
  imageUrl?: string;
  productId: string;
  surfaces: ConsumableSurface[];
  order: number;
  published: boolean;
}
