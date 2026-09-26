import { AD_FIRST_POSITION, AD_INTERVAL } from './AdConstants';
import { AdListEntry } from './AdListEntry';
import AdListEntryKind from './AdListEntryKind';

// AD-1: n번째(0부터) 광고 자리가 몇 번째 항목 뒤에 오는지. 6, 16, 26, …
export const getAdSlotPosition = (slotIndex: number): number => {
  return AD_FIRST_POSITION + slotIndex * AD_INTERVAL;
};

// 항목 배열 사이에 광고 자리를 끼운다. 자리는 항목 순번으로만 정해지므로 새로고침·페이지 추가에도
// 같은 자리에 온다. 광고를 받지 못한 자리(`isSlotFilled`가 false)는 접는다 — 빈 칸을 남기지 않는다.
export const interleaveAdSlots = <T>(
  items: readonly T[],
  isSlotFilled: (slotIndex: number) => boolean
): AdListEntry<T>[] => {
  const entries: AdListEntry<T>[] = [];
  let slotIndex = 0;

  items.forEach((item, index) => {
    entries.push({ kind: AdListEntryKind.Item, item, ordinal: index });

    const itemCount = index + 1;

    if (itemCount === getAdSlotPosition(slotIndex)) {
      if (isSlotFilled(slotIndex)) {
        entries.push({
          kind: AdListEntryKind.Ad,
          slotIndex,
          ordinal: itemCount,
        });
      }

      slotIndex += 1;
    }
  });

  return entries;
};
