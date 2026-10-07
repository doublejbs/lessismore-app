import ConsumableCommunityRowKind from './ConsumableCommunityRowKind';
import { ConsumableProduct } from './ConsumableProduct';
import {
  CONSUMABLE_COMMUNITY_CARD_ITEMS,
  CONSUMABLE_COMMUNITY_INTERVAL,
} from './ConsumableSlotConstants';

export interface ConsumableCommunityPostRow<T> {
  kind: ConsumableCommunityRowKind.Post;
  post: T;
}

export interface ConsumableCommunityCardRow {
  kind: ConsumableCommunityRowKind.Consumable;
  // 목록에서 몇 번째 소모품 카드인지(0부터). 안정 키(`consumable-slot-${slot}`)와 상품 순환에 쓴다.
  slot: number;
  products: ConsumableProduct[];
}

export type ConsumableCommunityRow<T> =
  | ConsumableCommunityPostRow<T>
  | ConsumableCommunityCardRow;

/**
 * k번째(0부터) 카드에 보일 상품 — `order` 순 목록에서 k*3번째부터 3개를 순환해 고른다(CP-6).
 * 상품이 3개 이하면 모든 카드가 같은 상품을 보인다.
 */
export const pickConsumablesForSlot = (
  products: ConsumableProduct[],
  slot: number,
  itemsPerCard: number = CONSUMABLE_COMMUNITY_CARD_ITEMS
): ConsumableProduct[] => {
  if (products.length <= itemsPerCard) {
    return products;
  }

  const start = slot * itemsPerCard;

  return Array.from(
    { length: itemsPerCard },
    (_, index) => products[(start + index) % products.length]
  );
};

/**
 * 게시글 목록 사이에 소모품 카드를 끼운다(CP-6 / CM-15).
 *
 * - 게시글 `interval`개마다 그 뒤에 한 장(10번째 뒤, 20번째 뒤, …). 순번은 페이지를 넘어 이어 센다 —
 *   이 함수는 지금까지 불러온 전체 목록을 받으므로 페이지가 늘어도 자리가 튀지 않는다.
 * - 게시글이 1개 이상 `interval`개 미만이면 목록 끝에 한 장(정확히 `interval`개면 모듈로 규칙이 끝에 둔다).
 * - 게시글 0개·상품 0개면 게시글 행만 돌려준다(빈 상태·조회 실패에 카드 없음).
 */
export const buildConsumableCommunityRows = <T>(
  posts: readonly T[],
  products: ConsumableProduct[],
  interval: number = CONSUMABLE_COMMUNITY_INTERVAL
): ConsumableCommunityRow<T>[] => {
  const rows: ConsumableCommunityRow<T>[] = [];

  if (products.length === 0 || posts.length === 0) {
    posts.forEach(post => {
      rows.push({ kind: ConsumableCommunityRowKind.Post, post });
    });

    return rows;
  }

  let slot = 0;

  const pushCard = () => {
    rows.push({
      kind: ConsumableCommunityRowKind.Consumable,
      slot,
      products: pickConsumablesForSlot(products, slot),
    });
    slot += 1;
  };

  posts.forEach((post, index) => {
    rows.push({ kind: ConsumableCommunityRowKind.Post, post });

    if ((index + 1) % interval === 0) {
      pushCard();
    }
  });

  if (posts.length < interval) {
    pushCard();
  }

  return rows;
};
