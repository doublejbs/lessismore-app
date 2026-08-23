import OrderOption from './OrderOption';
import OrderType from './OrderType';

// 템플릿 목록 정렬 옵션(BT-5). 첫 번째 옵션이 기본 선택이다.
export const createBagTemplateOrderOptions = (): OrderOption[] => [
  OrderOption.fromKey('common.order.createdDesc', OrderType.CreatedDesc),
  OrderOption.fromKey('common.order.weightDesc', OrderType.WeightDesc),
  OrderOption.fromKey('common.order.weightAsc', OrderType.WeightAsc),
  OrderOption.fromKey('common.order.nameAsc', OrderType.NameAsc),
];
