import { createContext } from 'react';

// 코스 화면(BD-11)·그룹 지도(GRP-10)가 함께 쓰는 바텀 시트가 안의 목록에 건네는 손잡이 —
// 목록 맨 위에서 아래로 당기면 시트가 한 단 내려간다.
export interface RouteSheetContextValue {
  onPullDownAtTop: () => void;
}

const RouteSheetContext = createContext<RouteSheetContextValue | null>(null);

export default RouteSheetContext;
