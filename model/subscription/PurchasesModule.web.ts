import type { Purchases } from './PurchasesModule';

// SUB §5: 웹에는 구독이 없다 — 구독 SDK를 번들에 싣지 않는다.
export const loadPurchases = (): Purchases | null => {
  return null;
};
