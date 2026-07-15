import GearAddMode from './GearAddMode';

// GE-8: 장비 추가 검색(/search) 진입 컨텍스트. 검색 결과 카드 `+` 담기 동작을 결정한다.
// - Warehouse: 창고 등록만(배낭 담기 모달 없음)
// - Bag: 창고 등록 + `bagId` 배낭에 바로 담기
// 미지정(undefined)이면 탐색 탭 기본 동작(창고 등록 후 배낭 담기 모달, SR-3).
export interface GearAddContext {
  mode: GearAddMode;
  bagId?: string;
}
