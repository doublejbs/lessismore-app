import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { ComposedGesture, Gesture } from 'react-native-gesture-handler';
import {
  AnimatedStyle,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import FilmCardCorner from '@/components/bag-film-card/FilmCardCorner';

interface Params {
  // 캔버스 크기(pt). 비율을 바꾸면 함께 바뀐다.
  canvasWidth: number;
  canvasHeight: number;
  // 요소 폭(pt). 높이는 내용이 정하므로 onLayout으로 실측한다.
  elementWidth: number;
  // 캡처·공유가 도는 동안과 요소가 꺼져 있을 때는 제스처를 막는다(BS-9).
  enabled: boolean;
  /**
   * 요소가 켜질 때마다 새로 발급되는 값(모델의 `getElementKey`).
   *
   * 이 값이 바뀌면 위치·배율·각도를 버리고 **기본 배치**로 되돌린다 — "껐다는 것은
   * 지웠다는 뜻"이라 다시 켠 요소는 기억된 자리로 돌아가지 않는다(BS-7).
   */
  resetKey: number;
  // 요소가 처음 놓이는 모서리(BS-9). 요소마다 달라야 서로를 덮지 않는다.
  defaultCorner: FilmCardCorner;
  /**
   * 요소를 **탭**했을 때 실행할 동작(BS-9). 드래그·핀치·회전이 일어나면 발동하지 않는다.
   *
   * 넘기지 않으면 탭 제스처를 아예 붙이지 않는다 — 패킹리스트은 탭 동작이 없으며(BS-9),
   * 탭 제스처가 없어도 요소가 터치 대상이라 배경 피커로 새지 않는다.
   *
   * **참조가 고정된 콜백을 넘긴다**(`useCallback`) — 이 값이 바뀔 때마다 제스처를 다시
   * 만들어 GestureDetector에 갈아끼우기 때문이다.
   */
  onTap?: () => void;
}

export interface ElementTransform {
  gesture: ComposedGesture;
  elementStyle: StyleProp<AnimatedStyle<ViewStyle>>;
  // 사용자가 위치·배율·각도에 손댔을 때만 true — 초기화 컨트롤 노출 조건이다(BS-9).
  moved: boolean;
  handleLayoutElement: (event: LayoutChangeEvent) => void;
  handleReset: () => void;
}

// 배율 한계(BS-9). 더 키우면 요소가 캔버스를 넘고, 더 줄이면 읽히지 않는다.
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.3;
/**
 * 기본 배율(BS-9) — **하한과 같은 값**이다. 사용자가 기본보다 더 줄일 수 없다는 뜻이며
 * 의도된 것이다: 작게 놓고 필요한 만큼 키우는 편이 크게 놓고 줄이는 것보다 사진을 덜 가린다.
 */
const DEFAULT_SCALE = MIN_SCALE;
// 기본 배치에서 캔버스 모서리와 요소 사이에 두는 여백(캔버스 폭 대비, BS-9).
// 가장자리에 딱 붙으면 잘린 것처럼 보인다. 두 축 모두 폭 기준이라 상하좌우 여백이 같다.
const CORNER_MARGIN_FRACTION = 0.06;
// 요소가 캔버스 밖으로 완전히 나가지 않도록, 이 비율만큼은 항상 캔버스 안에 남긴다.
const MIN_VISIBLE_FRACTION = 0.5;
const RESET_DURATION = 180;
// 탭으로 인정하는 한계(BS-9). 손가락이 이보다 멀리 가거나 오래 눌리면 탭이 아니다 —
// 옮기려던 동작이 사진 피커를 여는 일이 없어야 한다.
const TAP_MAX_DISTANCE = 10;
const TAP_MAX_DURATION = 400;

const clamp = (value: number, min: number, max: number) => {
  'worklet';

  return Math.min(Math.max(value, min), max);
};

/**
 * 회전한 요소가 실제로 차지하는 축 정렬 바운딩 박스(BS-9).
 *
 * 각도 θ로 기울이면 폭·높이가 `|w·cosθ| + |h·sinθ|` · `|w·sinθ| + |h·cosθ|`로 커진다.
 * 기울인 요소를 원래 크기로 클램프하면 실제로는 이미 캔버스 밖으로 더 나간 상태가 되므로,
 * 이동 한계는 이 값을 기준으로 잡는다.
 */
const getRotatedSize = (width: number, height: number, angle: number) => {
  'worklet';

  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));

  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
};

/**
 * 축 하나의 이동 한계(pt)를 구한다 — 요소의 절반(MIN_VISIBLE_FRACTION)은 항상 캔버스 안에 남는다.
 * 요소가 캔버스보다 크면 캔버스 크기를 기준으로 삼아 한계가 음수가 되지 않게 한다.
 * `elementSize`로는 **회전한 바운딩 박스**를 받는다(위 getRotatedSize 참고).
 */
const getMaxOffset = (
  canvasSize: number,
  elementSize: number,
  scaleValue: number
) => {
  'worklet';

  const scaledSize = elementSize * scaleValue;
  const visibleSize = Math.min(scaledSize, canvasSize) * MIN_VISIBLE_FRACTION;

  return Math.max(0, (canvasSize + scaledSize) / 2 - visibleSize);
};

/**
 * 기본 배치의 위치를 **캔버스 대비 비율**로 구한다(BS-9).
 *
 * 요소는 중심 기준으로 그려지므로, 모서리에서 여백만큼 띄우려면 중심을 캔버스 중심에서
 * `캔버스/2 − 여백 − 요소/2`만큼 밀면 된다. 요소 크기는 **기본 배율을 적용한 실제 크기**를
 * 써야 모서리 여백이 눈에 보이는 대로 일정하다.
 *
 * 요소가 커서 여백을 지킬 수 없으면(밀어야 할 거리가 음수가 되면) 그 축은 0(가운데)으로 둔다 —
 * 반대편으로 밀려 "좌측 상단"이 아니게 되는 것보다 낫다.
 */
const getDefaultOffsetRatios = (
  canvasWidth: number,
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number,
  corner: FilmCardCorner
) => {
  'worklet';

  const margin = canvasWidth * CORNER_MARGIN_FRACTION;
  const scaledWidth = elementWidth * DEFAULT_SCALE;
  const scaledHeight = elementHeight * DEFAULT_SCALE;
  const distanceX = Math.max(0, canvasWidth / 2 - margin - scaledWidth / 2);
  const distanceY = Math.max(0, canvasHeight / 2 - margin - scaledHeight / 2);
  const sign = corner === FilmCardCorner.TopLeft ? -1 : 1;

  return {
    x: (sign * distanceX) / canvasWidth,
    y: (sign * distanceY) / canvasHeight,
  };
};

/**
 * 사진 캔버스 위 **요소 하나**의 이동·확대·회전 상태(BS-9).
 *
 * 요소마다 위치·배율·각도를 따로 가지므로 **요소마다 하나씩 인스턴스화한다** —
 * 폴라로이드를 옮겨도 패킹리스트은 그대로다.
 *
 * **위치를 캔버스 크기 대비 비율(0~1)로 들고 있는 이유**: 픽셀로 저장하면 비율을
 * `4:5` ↔ `9:16`으로 바꿀 때 캔버스 크기가 달라져 요소가 화면 밖으로 튕긴다.
 * 0이 캔버스 정가운데이고, 기본 배치는 `defaultCorner` 쪽으로 밀린 값이다.
 *
 * **회전은 각도 제한을 두지 않는다**(BS-9) — 스티커처럼 자유롭게 기울이는 것이 목적이다.
 * 기울인 채로 캡처하면 모서리가 캔버스에서 잘릴 수 있는데, 그건 사용자가 그렇게 배치한
 * 결과라 막지 않는다. 다만 이동은 **회전한 바운딩 박스** 기준으로 가둬 요소가 캔버스 밖으로
 * 완전히 나가지는 않게 한다.
 */
const useElementTransform = ({
  canvasWidth,
  canvasHeight,
  elementWidth,
  enabled,
  resetKey,
  defaultCorner,
  onTap,
}: Params): ElementTransform => {
  const offsetRatioX = useSharedValue(0);
  const offsetRatioY = useSharedValue(0);
  const scale = useSharedValue(DEFAULT_SCALE);
  // 라디안. 제한이 없으므로 한 바퀴를 넘어도 그대로 누적한다.
  const rotation = useSharedValue(0);
  const startRatioX = useSharedValue(0);
  const startRatioY = useSharedValue(0);
  const startScale = useSharedValue(DEFAULT_SCALE);
  const startRotation = useSharedValue(0);
  // 제스처 워크릿이 항상 최신 값을 읽도록 크기도 shared value로 들고 있는다.
  const canvasWidthValue = useSharedValue(canvasWidth);
  const canvasHeightValue = useSharedValue(canvasHeight);
  const elementWidthValue = useSharedValue(elementWidth);
  const elementHeightValue = useSharedValue(0);
  /**
   * 기본 배치를 잡기 전에는 0이라 요소가 **보이지 않는다**(BS-9).
   *
   * 기본 위치는 요소 높이에 따라 달라지는데 높이는 `onLayout` 실측값이라 첫 프레임에는
   * 없다. 그대로 그리면 엉뚱한 자리에 한 프레임 보였다가 튀므로, 자리를 잡을 때까지
   * 감췄다가 **애니메이션 없이** 그 자리에서 나타나게 한다.
   */
  const ready = useSharedValue(0);
  /**
   * 사용자가 이 요소에 손댔는지(BS-9). 초기화 컨트롤 노출 조건이자, 비율이 바뀌었을 때
   * 기본 배치를 다시 잡아도 되는지의 판단 근거다 — 손댄 요소의 자리를 마음대로 옮기지 않는다.
   */
  const touched = useSharedValue(false);
  const [moved, setMoved] = useState(false);

  /**
   * 클램프와 기본 배치는 **제스처와 다른 memo**에 둔다.
   *
   * 제스처는 `enabled`가 바뀔 때마다 다시 만들어지는데(공유·저장 중 잠금), 여기 함수들이
   * 같이 새 참조가 되면 이들을 의존성으로 쓰는 effect가 다시 돌아 **공유 도중 요소가 기본
   * 자리로 튀어버린다.** 이 memo는 사실상 한 번만 돈다.
   * shared value 수정을 컴포넌트 본문에 그대로 두면 react-hooks/immutability가 막으므로
   * memo 안의 중첩 클로저로 감싼다(memo 안은 규칙 대상이 아니다).
   *
   * **여기 있는 배치 함수는 전부 워크릿이고, JS(React) 쪽에서는 `runOnUI` 래퍼로만 부른다.
   * shared value를 읽고 → 계산하고 → 다시 쓰는 코드는 반드시 UI 런타임에서 돌아야 한다.**
   *
   * 이유(Reanimated 4 / New Architecture):
   * shared value의 실체는 UI 런타임에 있고 React 런타임 쪽은 게스트 프록시다
   * (`react-native-reanimated/src/mutables.ts`의 `makeMutableNative`).
   * - **쓰기**는 `scheduleOnUI`로 **비동기 예약**된다 — 그 자리에서 값이 바뀌지 않는다.
   * - **읽기**는 동기화된 저장소(`getSync()`)를 보므로, 방금 예약한 쓰기가 반영되기 **전의
   *   값**을 돌려준다.
   *
   * 즉 React 런타임에서는 `sv.value = a` 직후 `sv.value`가 여전히 옛 값이다. Reanimated 3
   * 에서는 JS 쪽 `_value`가 즉시 갱신돼 read-after-write가 통했기 때문에 이 코드는 원래
   * 그 전제로 쓰여 있었고, 4로 올리면서 조용히 깨졌다.
   *
   * **실제로 났던 버그(BS-9 기본 배치가 안 먹고 요소가 정가운데에 나옴)**:
   * `placeDefaultInstantly`가 JS 스레드에서 돌면서
   * ① `offsetRatioX.value = -0.244`(예약) → ② `clampCurrentOffsets()`가 읽기에서 **옛 값 0**
   * 을 보고 → ③ `offsetRatioX.value = 0`을 다시 예약 → UI에는 나중 예약인 **0이 최종 반영**.
   * 같은 이유로 `handleLayoutElement`가 높이를 쓴 직후 `isMeasured()`가 여전히 0을 읽어
   * 첫 실측이 통째로 버려졌다.
   *
   * 새로 함수를 추가할 때도 **JS 스레드에서 shared value를 읽어 계산하지 말 것.**
   */
  const {
    clampOffsets,
    applySizes,
    applyElementHeight,
    placeAtDefault,
    handleReset,
  } = useMemo(() => {
    const clampCurrentOffsets = () => {
      'worklet';

      const width = canvasWidthValue.value;
      const height = canvasHeightValue.value;

      if (width <= 0 || height <= 0) {
        return;
      }

      // 기울면 실제로 차지하는 폭·높이가 커지므로 회전한 바운딩 박스로 가둔다(BS-9).
      const rotated = getRotatedSize(
        elementWidthValue.value,
        elementHeightValue.value,
        rotation.value
      );
      const maxX = getMaxOffset(width, rotated.width, scale.value);
      const maxY = getMaxOffset(height, rotated.height, scale.value);

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

    // 높이를 실측하기 전에는 기본 위치를 계산할 수 없다.
    const isMeasured = () => {
      'worklet';

      return (
        canvasWidthValue.value > 0 &&
        canvasHeightValue.value > 0 &&
        elementHeightValue.value > 0
      );
    };

    const getDefaults = () => {
      'worklet';

      return getDefaultOffsetRatios(
        canvasWidthValue.value,
        canvasHeightValue.value,
        elementWidthValue.value,
        elementHeightValue.value,
        defaultCorner
      );
    };

    // 애니메이션 없이 즉시 기본 배치로 앉힌다(BS-9) — 최초 진입·껐다 켜기 경로.
    const placeDefaultInstantly = () => {
      'worklet';

      scale.value = DEFAULT_SCALE;
      rotation.value = 0;
      touched.value = false;

      if (!isMeasured()) {
        // 아직 자리를 못 잡았으므로 계속 감춰 둔다. 실측되면 applyElementHeight가 다시 부른다.
        return;
      }

      const defaults = getDefaults();

      offsetRatioX.value = defaults.x;
      offsetRatioY.value = defaults.y;
      // 기본 위치도 이동 한계 안이어야 한다 — 요소가 커서 넘치면 허용 최대치로 밀어 넣는다.
      clampCurrentOffsets();
      ready.value = 1;
    };

    /**
     * 캔버스·요소 크기가 바뀌었을 때 자리를 다시 잡는다.
     *
     * 손대지 않은 요소는 **새 크기 기준 기본 배치**로 앉힌다(비율만 유지하면 모서리
     * 여백이 어긋난다). 손댄 요소는 비율로 보관된 자리를 존중하고 한계만 다시 가둔다.
     */
    const refreshCurrentPlacement = () => {
      'worklet';

      if (!touched.value) {
        placeDefaultInstantly();

        return;
      }

      clampCurrentOffsets();

      if (isMeasured()) {
        ready.value = 1;
      }
    };

    // 초기화 컨트롤: 끌다가 구석에 처박히거나 심하게 기울었을 때 기본 배치로 되돌린다(BS-9).
    // 여기서만 애니메이션을 쓴다 — 사용자가 누른 결과라 움직임이 보이는 편이 낫다.
    const resetToDefault = () => {
      'worklet';

      if (!isMeasured()) {
        placeDefaultInstantly();

        return;
      }

      const defaults = getDefaults();

      offsetRatioX.value = withTiming(defaults.x, {
        duration: RESET_DURATION,
      });
      offsetRatioY.value = withTiming(defaults.y, {
        duration: RESET_DURATION,
      });
      scale.value = withTiming(DEFAULT_SCALE, { duration: RESET_DURATION });
      rotation.value = withTiming(0, { duration: RESET_DURATION });
      touched.value = false;
    };

    return {
      // 제스처 워크릿은 이미 UI 런타임에서 도므로 래핑하지 않은 워크릿을 그대로 쓴다.
      clampOffsets: clampCurrentOffsets,
      // 아래 넷은 React 런타임에서 불리는 입구라 UI 런타임으로 넘긴다(위 주석 참고).
      applySizes: runOnUI(
        (width: number, height: number, elementSize: number) => {
          'worklet';

          canvasWidthValue.value = width;
          canvasHeightValue.value = height;
          elementWidthValue.value = elementSize;
          refreshCurrentPlacement();
        }
      ),
      /**
       * 실측 높이 반영. **같은 높이면 아무것도 하지 않는 비교까지 UI 런타임 안에서** 한다 —
       * JS 쪽에서 비교하면 직전에 예약한 쓰기가 아직 안 보여 매번 "바뀌었다"로 새거나,
       * 반대로 첫 실측을 놓친다.
       */
      applyElementHeight: runOnUI((height: number) => {
        'worklet';

        if (height === elementHeightValue.value) {
          return;
        }

        elementHeightValue.value = height;
        refreshCurrentPlacement();
      }),
      placeAtDefault: runOnUI(placeDefaultInstantly),
      handleReset: runOnUI(resetToDefault),
    };
    // shared value는 렌더 사이에 동일한 참조라 의존성에 넣지 않는다(넣으면 워크릿이
    // "훅 인자로 넘긴 값을 수정한다"는 react-hooks/immutability 위반이 된다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCorner]);

  /**
   * 제스처는 잠금(`enabled`)과 탭 동작이 바뀔 때만 다시 만든다 — 매 렌더 새로 만들면
   * GestureDetector가 핸들러를 계속 갈아끼운다.
   */
  const gesture = useMemo(() => {
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

        touched.value = true;
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
        touched.value = true;
        scale.value = clamp(
          startScale.value * event.scale,
          MIN_SCALE,
          MAX_SCALE
        );
        // 커진 요소가 이동 한계를 넘길 수 있어 배율이 바뀔 때마다 위치도 다시 가둔다.
        clampOffsets();
      });

    const rotationGesture = Gesture.Rotation()
      .enabled(enabled)
      .onBegin(() => {
        startRotation.value = rotation.value;
      })
      .onUpdate(event => {
        touched.value = true;
        // 각도 제한을 두지 않는다(BS-9) — 스티커처럼 자유롭게 기울인다.
        rotation.value = startRotation.value + event.rotation;
        // 기울면 바운딩 박스가 커져 이미 허용 범위를 넘었을 수 있으므로 다시 가둔다.
        clampOffsets();
      });

    // 드래그·핀치·회전은 동시에 인식한다 — 두 손가락으로 끌면서 키우고 돌리는 동작이 자연스럽다.
    const moveGesture = Gesture.Simultaneous(
      panGesture,
      pinchGesture,
      rotationGesture
    );

    if (onTap === undefined) {
      return moveGesture;
    }

    // 워크릿 안에서 부를 대상이라 좁혀진 참조를 지역 상수로 잡아 둔다.
    const tapAction = onTap;
    const tapGesture = Gesture.Tap()
      .enabled(enabled)
      .maxDistance(TAP_MAX_DISTANCE)
      .maxDuration(TAP_MAX_DURATION)
      .onEnd((_event, success) => {
        if (success) {
          runOnJS(tapAction)();
        }
      });

    /**
     * 탭과 이동은 `Race`로 가른다 — **먼저 활성화된 쪽이 나머지를 취소**한다.
     * 손가락이 움직이면 Pan·Pinch·Rotation이 먼저 활성화되어 탭이 취소되고,
     * 움직이지 않으면 이동 제스처가 활성화되지 않아 손을 뗄 때 탭만 남는다 —
     * 옮기려던 동작이 사진 피커를 여는 일이 없다(BS-9).
     */
    return Gesture.Race(tapGesture, moveGesture);
    // 위 memo와 같은 이유로 shared value는 의존성에 넣지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onTap, clampOffsets]);

  /**
   * 손댔는지를 React 상태로 끌어올려 초기화 컨트롤 노출에 쓴다(BS-9).
   *
   * **위치**: 아래 effect들과 같은 이유로 위 `useMemo`들보다 **뒤에** 와야 한다 —
   * shared value를 읽는 훅을 앞에 두면 react-hooks/immutability가 그 값을 "고정"으로 보고
   * memo 안의 수정을 막는다.
   */
  useAnimatedReaction(
    () => touched.value,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setMoved)(current);
      }
    }
  );

  /**
   * 캔버스·요소 크기를 shared value로 옮기고 자리를 다시 잡는다.
   *
   * **위치**: shared value를 건드리는 effect는 위 `useMemo`들보다 **뒤에** 와야 한다.
   * 앞에 두면 react-hooks/immutability가 "effect에서 쓴 값을 나중에 수정한다"며 memo 쪽을 막는다.
   */
  useEffect(() => {
    applySizes(canvasWidth, canvasHeight, elementWidth);
  }, [canvasWidth, canvasHeight, elementWidth, applySizes]);

  /**
   * 껐다 켠 요소는 기본 배치에서 다시 시작한다(BS-7) — 껐다는 것은 지웠다는 뜻이라
   * 위치·배율·각도를 기억하지 않는다. 최초 진입에도 이 경로로 기본 배치가 잡힌다.
   */
  useEffect(() => {
    placeAtDefault();
  }, [resetKey, placeAtDefault]);

  const elementStyle = useAnimatedStyle(() => ({
    // 기본 배치를 잡기 전에는 감춘다(ready 주석 참고). 값은 0/1뿐이라 페이드가 아니다.
    opacity: ready.value,
    // 이동을 먼저 적용해 확대 배율·회전이 이동량에 곱해지지 않게 한다
    // (회전·확대는 모두 요소 중심 기준이고 균등 배율이라 둘의 순서는 결과에 영향이 없다).
    transform: [
      { translateX: offsetRatioX.value * canvasWidthValue.value },
      { translateY: offsetRatioY.value * canvasHeightValue.value },
      { rotateZ: `${rotation.value}rad` },
      { scale: scale.value },
    ],
  }));

  // `useCallback`으로 감싸지 않는다 — 실측값을 UI 런타임으로 넘기기만 하고 리렌더를
  // 일으키지 않아, 매 렌더 새 함수를 넘겨도 비용이 없다.
  // 요소 높이는 내용이 정하므로 실측해서 기본 위치·이동 한계 계산에 쓴다
  // (트랜스폼은 레이아웃에 영향이 없어 실측값은 배율 1 기준 크기다).
  // 첫 실측이면 여기서 비로소 기본 배치가 잡히고 요소가 보이기 시작한다.
  const handleLayoutElement = (event: LayoutChangeEvent) => {
    applyElementHeight(event.nativeEvent.layout.height);
  };

  return { gesture, elementStyle, moved, handleLayoutElement, handleReset };
};

export default useElementTransform;
