import AdListEntryKind from './AdListEntryKind';

// 광고가 섞인 목록의 한 칸. `ordinal`은 그 칸 앞에 놓인 콘텐츠 항목 수다
// (항목은 자기 순번, 광고는 앞선 항목 수) — 광고 자리를 항목 순번 기준으로 고정하는 데 쓴다(AD-1).
export type AdListItemEntry<T> = {
  kind: AdListEntryKind.Item;
  item: T;
  ordinal: number;
};

export type AdListAdEntry = {
  kind: AdListEntryKind.Ad;
  slotIndex: number;
  ordinal: number;
};

export type AdListEntry<T> = AdListItemEntry<T> | AdListAdEntry;
