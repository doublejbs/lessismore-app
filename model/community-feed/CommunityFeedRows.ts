import { AdListEntry } from '@/model/ads/AdListEntry';
import AdListEntryKind from '@/model/ads/AdListEntryKind';
import {
  buildConsumableCommunityRows,
  ConsumableCommunityCardRow,
} from '@/model/consumable/ConsumableCommunitySlots';
import ConsumableCommunityRowKind from '@/model/consumable/ConsumableCommunityRowKind';
import { ConsumableProduct } from '@/model/consumable/ConsumableProduct';

// 소모품 카드 칸. `ordinal`은 광고 칸과 같은 뜻(그 칸 앞의 게시글 수)이라 광고 보이는 범위 계산에 함께 쓰인다.
export type CommunityConsumableEntry = ConsumableCommunityCardRow & {
  ordinal: number;
};

export type CommunityFeedRow<T> = AdListEntry<T> | CommunityConsumableEntry;

/**
 * 커뮤니티 피드 행 = 광고가 끼워진 게시글 목록(AD-1) + 소모품 카드(CP-6 / CM-15).
 *
 * 두 자리 모두 **게시글 순번**으로만 정해진다 — 광고는 6·16·26…번째 뒤, 소모품은 10·20·30…번째 뒤
 * (게시글이 10개 미만이면 끝에 한 장). 서로의 칸을 세지 않으므로 한쪽이 접혀도 다른 쪽 자리가 밀리지 않는다.
 * 상품이 없으면 광고 목록을 그대로 돌려준다(같은 배열 — FlatList `data`가 렌더마다 바뀌지 않게).
 */
export const buildCommunityFeedRows = <T>(
  posts: readonly T[],
  adEntries: AdListEntry<T>[],
  products: ConsumableProduct[]
): CommunityFeedRow<T>[] => {
  if (products.length === 0 || posts.length === 0) {
    return adEntries;
  }

  // 소모품 카드를 "몇 번째 게시글 뒤"로 모은다.
  const cardsAfterPostCount = new Map<number, ConsumableCommunityCardRow>();
  let postCount = 0;

  buildConsumableCommunityRows(posts, products).forEach(row => {
    if (row.kind === ConsumableCommunityRowKind.Post) {
      postCount += 1;

      return;
    }

    cardsAfterPostCount.set(postCount, row);
  });

  const rows: CommunityFeedRow<T>[] = [];

  adEntries.forEach(entry => {
    rows.push(entry);

    if (entry.kind !== AdListEntryKind.Item) {
      return;
    }

    const precedingPostCount = entry.ordinal + 1;
    const card = cardsAfterPostCount.get(precedingPostCount);

    if (card) {
      rows.push({ ...card, ordinal: precedingPostCount });
    }
  });

  return rows;
};
