import OrderOption from './OrderOption';
import OrderType from './OrderType';

// 장비 목록 정렬 옵션(창고 WH-3·배낭 편집 BD-4). 첫 번째 옵션이 기본 선택이다.
export const createGearOrderOptions = (): OrderOption[] => [
  OrderOption.fromKey('common.order.nameAsc', OrderType.NameAsc),
  OrderOption.fromKey('common.order.weightAsc', OrderType.WeightAsc),
  OrderOption.fromKey('common.order.weightDesc', OrderType.WeightDesc),
  OrderOption.fromKey('common.order.createdDesc', OrderType.CreatedDesc),
];
