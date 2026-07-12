import dayjs from 'dayjs';

// 배낭 정보 수정 formSheet(`/bag-info-edit`)용 모듈 레벨 핸드오프.
// 배낭 상세의 BagDetail 인스턴스는 뷰 스코프라 app 싱글톤·라우트 param으로 넘길 수 없어,
// 트리거가 router.push 직전 현재값·onSave 콜백을 이 모듈 변수에 넣고 라우트가 스냅샷으로 렌더한다.
// (공용 정렬 시트의 SortSheetHandoff와 동일한 패턴)

export interface BagInfoEditContext {
  name: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  onSave: (
    name: string,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ) => Promise<void>;
}

let currentContext: BagInfoEditContext | null = null;

export const setBagInfoEditContext = (context: BagInfoEditContext) => {
  currentContext = context;
};

export const getBagInfoEditContext = (): BagInfoEditContext | null => {
  return currentContext;
};

export const clearBagInfoEditContext = () => {
  currentContext = null;
};
