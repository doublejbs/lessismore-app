import { createContext } from 'react';

// 바텀 시트(BD-11)가 안의 목록에 건네는 손잡이 — 목록 맨 위에서 아래로 당기면 시트가 한 단 내려간다.
export interface BagRouteSheetContextValue {
  onPullDownAtTop: () => void;
}

const BagRouteSheetContext = createContext<BagRouteSheetContextValue | null>(
  null
);

export default BagRouteSheetContext;
