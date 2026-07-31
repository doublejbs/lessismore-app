import OrderOption from './OrderOption';
import OrderType from './OrderType';

// 배낭 목록 정렬 옵션(BAG-6). 첫 번째 옵션이 기본 선택이다.
export const createBagOrderOptions = (): OrderOption[] => [
  // 기본 정렬이다(BAG-6) — 방금 만든 배낭이 맨 위에 온다.
  // 여행 날짜와 만든 순서는 다르다: 다음 달 여행을 오늘 만들 수 있다.
  OrderOption.from('최근 추가순', OrderType.CreatedDesc),
  OrderOption.from('최근 여행순', OrderType.StartDateDesc),
  OrderOption.from('오래된 여행순', OrderType.StartDateAsc),
  OrderOption.from('무거운순', OrderType.WeightDesc),
  OrderOption.from('가벼운순', OrderType.WeightAsc),
  OrderOption.from('이름순', OrderType.NameAsc),
];
