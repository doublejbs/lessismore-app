import OrderOption from './OrderOption';
import OrderType from './OrderType';

// 배낭 목록 정렬 옵션(BAG-6). 첫 번째 옵션이 기본 선택이다.
export const createBagOrderOptions = (): OrderOption[] => [
  // 기본 정렬이다(BAG-6) — 방금 만든 배낭이 맨 위에 온다.
  // 여행 날짜와 만든 순서는 다르다: 다음 달 여행을 오늘 만들 수 있다.
  OrderOption.fromKey('common.order.createdDesc', OrderType.CreatedDesc),
  OrderOption.fromKey('common.order.startDateDesc', OrderType.StartDateDesc),
  OrderOption.fromKey('common.order.startDateAsc', OrderType.StartDateAsc),
  OrderOption.fromKey('common.order.weightDesc', OrderType.WeightDesc),
  OrderOption.fromKey('common.order.weightAsc', OrderType.WeightAsc),
  OrderOption.fromKey('common.order.nameAsc', OrderType.NameAsc),
];
