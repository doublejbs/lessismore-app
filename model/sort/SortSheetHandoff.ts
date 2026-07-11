// 공용 정렬 시트(`/sort-sheet`)용 모듈 레벨 핸드오프.
// 피드/탐색/창고의 정렬 model은 뷰 스코프(useState)라 app 싱글톤·라우트 param으로 넘길 수 없어,
// 트리거가 router.push 직전 옵션·현재값·onSelect 콜백을 이 모듈 변수에 넣고 라우트가 스냅샷으로 렌더한다.

export interface SortSheetOption {
  key: string;
  label: string;
}

export interface SortSheetContext {
  options: SortSheetOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

let currentContext: SortSheetContext | null = null;

export const setSortSheetContext = (context: SortSheetContext) => {
  currentContext = context;
};

export const getSortSheetContext = (): SortSheetContext | null => {
  return currentContext;
};

export const clearSortSheetContext = () => {
  currentContext = null;
};
