import ConsumableCategory from './ConsumableCategory';
import ConsumableSurface from './ConsumableSurface';

// `consumable-product/{productId}` 문서(DataModel DM-32). 가격 필드는 두지 않는다(CP-1).
export interface ConsumableProduct {
  // 문서 id = 쿠팡 productId
  id: string;
  name: string;
  pitch: string;
  category: ConsumableCategory;
  // 쿠팡 파트너스 단축 링크(link.coupang.com/a/...)
  coupangUrl: string;
  // 쿠팡 CDN 상품 이미지. 없으면 카드가 아이콘으로 폴백한다(CP-2).
  imageUrl?: string;
  productId: string;
  surfaces: ConsumableSurface[];
  order: number;
  published: boolean;
}
