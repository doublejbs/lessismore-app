import OrderOption from './OrderOption';
import OrderType from './OrderType';

// 장비 목록 정렬 옵션(창고 WH-3·배낭 편집 BD-4). 첫 번째 옵션이 기본 선택이다.
export const createGearOrderOptions = (): OrderOption[] => [
  OrderOption.from('이름순', OrderType.NameAsc),
  OrderOption.from('가벼운순', OrderType.WeightAsc),
  OrderOption.from('무거운순', OrderType.WeightDesc),
  OrderOption.from('최근 추가순', OrderType.CreatedDesc),
];
