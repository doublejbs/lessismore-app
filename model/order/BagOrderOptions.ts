import OrderOption from './OrderOption';
import OrderType from './OrderType';

// 배낭 목록 정렬 옵션(BAG-6). 첫 번째 옵션이 기본 선택이다.
export const createBagOrderOptions = (): OrderOption[] => [
  OrderOption.from('최근 여행순', OrderType.StartDateDesc),
  OrderOption.from('오래된 여행순', OrderType.StartDateAsc),
  OrderOption.from('무거운순', OrderType.WeightDesc),
  OrderOption.from('가벼운순', OrderType.WeightAsc),
  OrderOption.from('이름순', OrderType.NameAsc),
];
