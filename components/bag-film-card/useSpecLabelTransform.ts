import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface Params {
  // 캔버스 크기(pt). 비율을 바꾸면 함께 바뀐다.
  canvasWidth: number;
  canvasHeight: number;
  // 텍스트 블록 폭(pt). 높이는 내용이 정하므로 onLayout으로 실측한다.
  blockWidth: number;
  // 캡처·공유가 도는 동안에는 제스처를 막는다(BS-9).
  enabled: boolean;
}

// 배율 한계(BS-9). 더 키우면 글자가 캔버스를 넘고, 더 줄이면 읽히지 않는다.
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.3;
// 블록이 캔버스 밖으로 완전히 나가지 않도록, 이 비율만큼은 항상 캔버스 안에 남긴다.
const MIN_VISIBLE_FRACTION = 0.5;
const RESET_DURATION = 180;

const clamp = (value: number, min: number, max: number) => {
  'worklet';

  return Math.min(Math.max(value, min), max);
};

/**
 * 축 하나의 이동 한계(pt)를 구한다 — 블록의 절반(MIN_VISIBLE_FRACTION)은 항상 캔버스 안에 남는다.
 * 블록이 캔버스보다 크면 캔버스 크기를 기준으로 삼아 한계가 음수가 되지 않게 한다.
 */
const getMaxOffset = (
  canvasSize: number,
  blockSize: number,
  scaleValue: number
) => {
  'worklet';

  const scaledSize = blockSize * scaleValue;
  const visibleSize = Math.min(scaledSize, canvasSize) * MIN_VISIBLE_FRACTION;

  return Math.max(0, (canvasSize + scaledSize) / 2 - visibleSize);
};

/**
 * 스펙 라벨 텍스트 블록의 이동·확대 상태(BS-9).
 *
 * **위치를 캔버스 크기 대비 비율(0~1)로 들고 있는 이유**: 픽셀로 저장하면 비율을
 * `4:5` ↔ `9:16`으로 바꿀 때 캔버스 크기가 달라져 블록이 화면 밖으로 튕긴다.
 * 기본값 0은 캔버스 정가운데이며, 초기화 컨트롤이 이 값으로 되돌린다.
 * 회전은 지원하지 않는다.
 */
const useSpecLabelTransform = ({
  canvasWidth,
  canvasHeight,
  blockWidth,
  enabled,
}: Params) => {
  const offsetRatioX = useSharedValue(0);
  const offsetRatioY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startRatioX = useSharedValue(0);
  const startRatioY = useSharedValue(0);
  const startScale = useSharedValue(1);
  // 제스처 워크릿이 항상 최신 값을 읽도록 크기도 shared value로 들고 있는다.
  const canvasWidthValue = useSharedValue(canvasWidth);
  const canvasHeightValue = useSharedValue(canvasHeight);
  const blockWidthValue = useSharedValue(blockWidth);
  const blockHeightValue = useSharedValue(0);
  // 초기화 컨트롤은 기본 위치가 아닐 때만 노출한다.
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    canvasWidthValue.value = canvasWidth;
    canvasHeightValue.value = canvasHeight;
    blockWidthValue.value = blockWidth;
  }, [
    canvasWidth,
    canvasHeight,
    blockWidth,
    canvasWidthValue,
    canvasHeightValue,
    blockWidthValue,
  ]);

  useAnimatedReaction(
    () =>
      offsetRatioX.value !== 0 || offsetRatioY.value !== 0 || scale.value !== 1,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setMoved)(current);
      }
    }
  );

  /**
   * 제스처와 초기화 동작을 한 memo에서 만든다 — 같은 shared value 묶음을 다루기도 하고,
   * shared value 수정을 컴포넌트 본문에 그대로 두면 react-hooks/immutability가 막기 때문이다
   * (memo 안의 중첩 클로저는 규칙 대상이 아니다).
   */
  const { gesture, handleReset } = useMemo(() => {
    const clampOffsets = () => {
      'worklet';

      const width = canvasWidthValue.value;
      const height = canvasHeightValue.value;

      if (width <= 0 || height <= 0) {
        return;
      }

      const maxX = getMaxOffset(width, blockWidthValue.value, scale.value);
      const maxY = getMaxOffset(height, blockHeightValue.value, scale.value);

      offsetRatioX.value = clamp(
        offsetRatioX.value,
        -maxX / width,
        maxX / width
      );
      offsetRatioY.value = clamp(
        offsetRatioY.value,
        -maxY / height,
        maxY / height
      );
    };

    const panGesture = Gesture.Pan()
      .enabled(enabled)
      .onBegin(() => {
        startRatioX.value = offsetRatioX.value;
        startRatioY.value = offsetRatioY.value;
      })
      .onUpdate(event => {
        const width = canvasWidthValue.value;
        const height = canvasHeightValue.value;

        if (width <= 0 || height <= 0) {
          return;
        }

        offsetRatioX.value = startRatioX.value + event.translationX / width;
        offsetRatioY.value = startRatioY.value + event.translationY / height;
        clampOffsets();
      });

    const pinchGesture = Gesture.Pinch()
      .enabled(enabled)
      .onBegin(() => {
        startScale.value = scale.value;
      })
      .onUpdate(event => {
        scale.value = clamp(
          startScale.value * event.scale,
          MIN_SCALE,
          MAX_SCALE
        );
        // 커진 블록이 이동 한계를 넘길 수 있어 배율이 바뀔 때마다 위치도 다시 가둔다.
        clampOffsets();
      });

    // 끌다가 구석에 처박힌 블록을 가운데·기본 배율로 되돌린다(BS-9).
    const resetTransform = () => {
      offsetRatioX.value = withTiming(0, { duration: RESET_DURATION });
      offsetRatioY.value = withTiming(0, { duration: RESET_DURATION });
      scale.value = withTiming(1, { duration: RESET_DURATION });
    };

    return {
      // 드래그와 핀치를 동시에 인식한다 — 두 손가락으로 끌면서 키우는 동작이 자연스럽다.
      gesture: Gesture.Simultaneous(panGesture, pinchGesture),
      handleReset: resetTransform,
    };
    // shared value는 렌더 사이에 동일한 참조라 의존성에 넣지 않는다(넣으면 워크릿이
    // "훅 인자로 넘긴 값을 수정한다"는 react-hooks/immutability 위반이 된다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const blockStyle = useAnimatedStyle(() => ({
    // 이동을 먼저 적용해 확대 배율이 이동량에 곱해지지 않게 한다(확대는 블록 중심 기준).
    transform: [
      { translateX: offsetRatioX.value * canvasWidthValue.value },
      { translateY: offsetRatioY.value * canvasHeightValue.value },
      { scale: scale.value },
    ],
  }));

  // `useCallback`으로 감싸지 않는다 — shared value 수정은 리렌더를 일으키지 않아
  // 매 렌더 새 함수를 넘겨도 비용이 없다.
  // 블록 높이는 내용이 정하므로 실측해서 이동 한계 계산에 쓴다(트랜스폼은 레이아웃에 영향이 없다).
  const handleLayoutBlock = (event: LayoutChangeEvent) => {
    blockHeightValue.value = event.nativeEvent.layout.height;
  };

  return { gesture, blockStyle, moved, handleLayoutBlock, handleReset };
};

export default useSpecLabelTransform;
