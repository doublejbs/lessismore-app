import { useCallback, useContext } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import RouteSheetContext from '@/components/route/RouteSheetContext';

// 시트 안 목록 맨 위에서 이만큼(pt) 넘게 당겼다 놓으면 시트를 내린다 — 손이 살짝 미끄러진 것과 가른다.
const PULL_DOWN_THRESHOLD = 48;
// 맨 위를 넘겨 당기는 바운스(음수 오프셋)는 iOS에만 있다. 안드로이드는 오프셋이 0에 멈춰 당김을 읽을 수 없다.
const CAN_DETECT_PULL = Platform.OS === 'ios';

/**
 * 바텀 시트 안 목록의 "맨 위에서 당겨 내리기" (BD-11 · GRP-10). 목록 `ScrollView`의 `onScrollEndDrag`에 단다.
 * 시트 밖(웹 세로 쌓기 등)에서는 컨텍스트가 없어 아무 일도 하지 않는다.
 */
const useRouteSheetPullDown = () => {
  const sheet = useContext(RouteSheetContext);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!sheet || !CAN_DETECT_PULL) {
        return;
      }

      if (event.nativeEvent.contentOffset.y < -PULL_DOWN_THRESHOLD) {
        sheet.onPullDownAtTop();
      }
    },
    [sheet]
  );
};

export default useRouteSheetPullDown;
