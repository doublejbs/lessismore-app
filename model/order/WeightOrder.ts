import OrderType from './OrderType';

/**
 * 무게 미입력(0g)은 "가장 가벼움"이 아니므로 가벼운순에서만 뒤로 보낸다 (Warehouse.md WH-3).
 * 서버가 이미 정렬해 준 상대 순서는 그대로 두는 안정 분할이다.
 * 0 이하·비숫자(NaN)는 모두 미입력으로 보고 뒤로 보낸다.
 */
export const moveUnweightedLast = <T>(
  items: T[],
  order: OrderType,
  getWeight: (item: T) => string | number | undefined
): T[] => {
  if (order !== OrderType.WeightAsc) {
    return items;
  }

  const weighted: T[] = [];
  const unweighted: T[] = [];

  items.forEach(item => {
    if (Number(getWeight(item)) > 0) {
      weighted.push(item);
    } else {
      unweighted.push(item);
    }
  });

  return [...weighted, ...unweighted];
};
