import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';

interface BottomInsetInput {
  isAiming: boolean;
  isDrawing: boolean;
  // 조준 모드에서 비울 높이(세이프에어리어).
  safeAreaBottom: number;
  drawBarHeight: number;
  // 평소(시트가 떠 있을 때) 비울 높이 — 시트가 덮는 높이(기본 단까지).
  sheetInset: number;
}

/**
 * 지도 아래쪽에서 비울 높이 (BD-11 · GRP-10 · RD-2) — 조준 모드는 세이프에어리어, 그리기 모드는 하단 바 높이,
 * 평소는 시트가 덮는 높이. 출처 ⓘ·축척 막대 위치가 쓴다(두 지도 화면이 같은 규칙이다).
 */
export const getRouteDrawHostBottomInset = ({
  isAiming,
  isDrawing,
  safeAreaBottom,
  drawBarHeight,
  sheetInset,
}: BottomInsetInput): number => {
  if (isAiming) {
    return safeAreaBottom;
  }

  if (isDrawing) {
    return drawBarHeight;
  }

  return sheetInset;
};

/**
 * 코스 그리기 모드를 얹는 지도 화면(배낭 코스 `BagRouteMapView`·그룹 지도 `GroupMapCanvasView`)의 **레이아웃 몫** (RD-2).
 *
 * 하단 바 높이를 재고(`handleDrawBarLayout`), 카메라 맞춤 콜백이 참조를 고정한 채 읽을 수 있게 모드·바 높이의
 * 즉시 사본을 둔다(`getDrawingBottomPadding` — 모드가 아니면 `null`이라 화면이 시트 규칙으로 간다).
 * 카드 걷기처럼 화면마다 다른 일은 화면에 남긴다.
 *
 * 사본 동기화 이펙트가 카메라 이펙트보다 먼저 돌아야 하므로 화면 컴포넌트의 **위쪽**에서 부른다.
 */
const useRouteDrawHostLayout = (isDrawing: boolean) => {
  // 재기 전에는 0 — 첫 프레임만 컨트롤이 바 아래 여백으로 붙는다.
  const [drawBarHeight, setDrawBarHeight] = useState(0);
  const isDrawingRef = useRef(isDrawing);
  const drawBarHeightRef = useRef(drawBarHeight);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
    drawBarHeightRef.current = drawBarHeight;
  }, [drawBarHeight, isDrawing]);

  const handleDrawBarLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    setDrawBarHeight(previous =>
      Math.abs(previous - height) < 1 ? previous : height
    );
  }, []);

  const getDrawingBottomPadding = useCallback(
    (): number | null =>
      isDrawingRef.current ? drawBarHeightRef.current : null,
    []
  );

  return { drawBarHeight, handleDrawBarLayout, getDrawingBottomPadding };
};

export default useRouteDrawHostLayout;
