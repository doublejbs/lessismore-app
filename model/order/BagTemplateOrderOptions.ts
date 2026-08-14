import OrderOption from './OrderOption';
import OrderType from './OrderType';

// 템플릿 목록 정렬 옵션(BT-5). 첫 번째 옵션이 기본 선택이다.
export const createBagTemplateOrderOptions = (): OrderOption[] => [
  OrderOption.from('최근 추가순', OrderType.CreatedDesc),
  OrderOption.from('무거운순', OrderType.WeightDesc),
  OrderOption.from('가벼운순', OrderType.WeightAsc),
  OrderOption.from('이름순', OrderType.NameAsc),
];
