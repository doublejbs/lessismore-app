import {
  FC,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { AccessibilityActionEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import { Acg, AcgShadow, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagRouteSheetDetent from '@/model/bag-route/BagRouteSheetDetent';
import BagRouteSheetContext, {
  BagRouteSheetContextValue,
} from './BagRouteSheetContext';
import {
  BagRouteSheetDetents,
  getBagRouteSheetDetentHeight,
  SHEET_HANDLE_HEIGHT,
} from './BagRouteSheetLayout';

// 바깥(지도 화면)이 시트를 움직일 때 쓰는 손잡이 — 목록에서 포인트·코스를 고르면 펼침을 기본으로 내린다.
export interface BagRouteBottomSheetHandle {
  snapTo: (detent: BagRouteSheetDetent) => void;
  getDetent: () => BagRouteSheetDetent;
}

interface Props {
  // 단별 높이(pt) — 부모가 지도 칸·그래프 높이로 계산해 넘긴다. 바뀌면 지금 단의 새 높이로 따라간다.
  detents: BagRouteSheetDetents;
  initialDetent: BagRouteSheetDetent;
  /**
   * 시트 높이 알림 — 스냅이 끝났을 때와 끄는 동안(스로틀). 지도 출처 ⓘ·축척처럼 네이티브 prop으로만 옮길 수
   * 있는 것의 오프셋 갱신용이다. 매 프레임 따라가야 하는 것은 `animatedHeight`를 읽는다.
   */
  onHeightChange?: ((height: number) => void) | undefined;
  // 스냅이 끝나 단이 정해졌다 — 화면이 세션 동안 기억한다.
  onDetentChange?: ((detent: BagRouteSheetDetent) => void) | undefined;
  // 시트 높이를 담을 공유 값(선택) — 부모가 지도 컨트롤·그래프를 같은 프레임에 따라 움직이려고 넘긴다.
  animatedHeight?: SharedValue<number> | undefined;
  // false면 화면 밖으로 내린다(조준 모드 — BD-14).
  visible: boolean;
  // 손잡이 아래 끄는 영역(세그먼트 칩 줄 등). 손잡이와 함께 드래그된다.
  header?: ReactNode;
  // 고도 그래프 + 목록. 시트 높이에 맞춰 남는 세로를 채운다.
  children: ReactNode;
  ref?: Ref<BagRouteBottomSheetHandle>;
}

const DETENT_ORDER = [
  BagRouteSheetDetent.Collapsed,
  BagRouteSheetDetent.Half,
  BagRouteSheetDetent.Expanded,
];
/**
 * 스냅 스프링 — 감쇠비 1 이상(40 / 2√320 ≈ 1.12)이라 단을 지나쳐 튀지 않는다. 그래도 손을 세게 튕기면 넘을 수
 * 있어 단에서 멈추게 막는다.
 */
const SNAP_SPRING = {
  damping: 40,
  stiffness: 320,
  mass: 1,
  overshootClamping: true,
};
// 손을 뗀 속도를 이만큼(초) 내다본 자리에서 가장 가까운 단을 고른다 — 살짝 튕겨도 다음 단으로 간다.
const VELOCITY_PROJECTION_SEC = 0.15;
// 끄는 동안 높이 알림 간격(pt) — 지도 출처 오프셋은 네이티브 prop이라 매 프레임 보내지 않고 이만큼 움직일 때마다 보낸다.
const HEIGHT_EMIT_STEP = 16;
// 맨 끝 단을 넘겨 끌 때 손가락 대비 시트가 따라가는 비율 — 끝이라는 저항감.
const OVERDRAG_RATIO = 1 / 3;
// 이만큼(pt) 세로로 움직여야 끌기가 시작된다 — 칩 탭과 가른다.
const PAN_ACTIVE_OFFSET = 8;
const HIDE_DURATION_MS = 220;
// 숨길 때 그림자까지 화면 밖으로 내리는 여유.
const HIDDEN_EXTRA_OFFSET = 32;

/**
 * 배낭 코스 화면의 하단 바텀 시트 (BD-11) — 고도 그래프 + `코스 | 포인트` 세그먼트 + 목록이 지도 위에 얹힌다.
 * 손잡이·머리(세그먼트 줄)를 끌면 세 단(접힘 · 기본 · 펼침) 중 가장 가까운 단으로 스프링 스냅한다(속도 반영).
 * 목록 맨 위에서 아래로 당기면 한 단 내려간다(`BagRouteSheetContext`, iOS). 접근성: 손잡이가 조절 가능
 * 요소라 VoiceOver 위/아래 쓸기로 단을 옮긴다.
 *
 * 면은 순백 + 위 모서리 16이고, 지도 위에 떠 있으므로 그림자를 둔다(HM-8 — 그림자는 지도 위 요소에만).
 */
const BagRouteBottomSheetView: FC<Props> = ({
  detents,
  initialDetent,
  onHeightChange,
  onDetentChange,
  animatedHeight,
  visible,
  header,
  children,
  ref,
}) => {
  const l10n = app.getL10n();
  const { collapsed, half, expanded } = detents;
  const ownHeight = useSharedValue(
    getBagRouteSheetDetentHeight(detents, initialDetent)
  );
  const height = animatedHeight ?? ownHeight;
  const hiddenProgress = useSharedValue(visible ? 0 : 1);
  const startHeight = useSharedValue(0);
  const lastEmittedHeight = useSharedValue(0);
  const isDragging = useSharedValue(false);
  // 지금(또는 스냅 중인 목표) 단. 제스처 워클릿과 JS가 함께 읽는다.
  const currentDetent = useSharedValue(initialDetent);

  const emitHeight = useCallback(
    (value: number) => {
      onHeightChange?.(value);
    },
    [onHeightChange]
  );

  const handleSettled = useCallback(
    (detent: BagRouteSheetDetent, value: number) => {
      onDetentChange?.(detent);
      onHeightChange?.(value);
    },
    [onDetentChange, onHeightChange]
  );

  const snapTo = useCallback(
    (detent: BagRouteSheetDetent) => {
      const target = getBagRouteSheetDetentHeight(
        { collapsed, half, expanded },
        detent
      );

      currentDetent.set(detent);
      height.set(
        withSpring(target, SNAP_SPRING, finished => {
          if (finished) {
            scheduleOnRN(handleSettled, detent, target);
          }
        })
      );
    },
    [collapsed, currentDetent, expanded, half, handleSettled, height]
  );

  useImperativeHandle(
    ref,
    () => ({
      snapTo,
      getDetent: () => currentDetent.get(),
    }),
    [currentDetent, snapTo]
  );

  // 단 높이가 바뀌면(그래프를 쟀다·회전·코스 추가 가능 여부) 지금 단의 새 높이로 옮긴다. 끄는 중이면 손에 맡긴다.
  useEffect(() => {
    if (isDragging.get()) {
      return;
    }

    snapTo(currentDetent.get());
  }, [currentDetent, isDragging, snapTo]);

  useEffect(() => {
    hiddenProgress.set(
      withTiming(visible ? 0 : 1, {
        duration: HIDE_DURATION_MS,
      })
    );
  }, [hiddenProgress, visible]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-PAN_ACTIVE_OFFSET, PAN_ACTIVE_OFFSET])
        .onStart(() => {
          isDragging.set(true);
          // 진행 중인 스프링을 끊고 지금 자리에서 잡는다.
          startHeight.set(height.get());
          height.set(startHeight.get());
          lastEmittedHeight.set(startHeight.get());
        })
        .onUpdate(event => {
          const next = startHeight.get() - event.translationY;
          let resolved = next;

          if (next > expanded) {
            resolved = expanded + (next - expanded) * OVERDRAG_RATIO;
          } else if (next < collapsed) {
            resolved = collapsed - (collapsed - next) * OVERDRAG_RATIO;
          }

          height.set(resolved);

          if (
            Math.abs(resolved - lastEmittedHeight.get()) >= HEIGHT_EMIT_STEP
          ) {
            lastEmittedHeight.set(resolved);
            scheduleOnRN(emitHeight, resolved);
          }
        })
        .onEnd(event => {
          const projected =
            height.get() - event.velocityY * VELOCITY_PROJECTION_SEC;
          const candidates = [collapsed, half, expanded];
          let index = 0;
          let bestDistance = Math.abs(candidates[0] - projected);

          for (let i = 1; i < candidates.length; i += 1) {
            const distance = Math.abs(candidates[i] - projected);

            if (distance < bestDistance) {
              bestDistance = distance;
              index = i;
            }
          }

          const target = candidates[index];
          const detent = DETENT_ORDER[index];

          currentDetent.set(detent);
          height.set(
            withSpring(
              target,
              { ...SNAP_SPRING, velocity: -event.velocityY },
              finished => {
                if (finished) {
                  scheduleOnRN(handleSettled, detent, target);
                }
              }
            )
          );
        })
        .onFinalize(() => {
          isDragging.set(false);
        }),
    [
      collapsed,
      currentDetent,
      emitHeight,
      expanded,
      half,
      handleSettled,
      height,
      isDragging,
      lastEmittedHeight,
      startHeight,
    ]
  );

  // 접근성: 위로 쓸기(increment) = 한 단 올리기, 아래로 쓸기(decrement) = 한 단 내리기.
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const index = DETENT_ORDER.indexOf(currentDetent.get());
    const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const nextIndex = Math.min(
      Math.max(index + step, 0),
      DETENT_ORDER.length - 1
    );

    if (nextIndex === index) {
      return;
    }

    snapTo(DETENT_ORDER[nextIndex]);
  };

  const contextValue = useMemo<BagRouteSheetContextValue>(
    () => ({
      // 펼침에서만 내린다 — 기본·접힘에서 목록을 당기는 것은 스크롤 바운스일 뿐이다.
      onPullDownAtTop: () => {
        if (currentDetent.get() === BagRouteSheetDetent.Expanded) {
          snapTo(BagRouteSheetDetent.Half);
        }
      },
    }),
    [currentDetent, snapTo]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    height: Math.max(height.get(), 0),
    transform: [
      {
        translateY: hiddenProgress.get() * (height.get() + HIDDEN_EXTRA_OFFSET),
      },
    ],
  }));

  return (
    <Animated.View
      style={[styles.sheet, sheetStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      <GestureDetector gesture={panGesture}>
        <View>
          <View
            style={styles.handle}
            accessible
            accessibilityRole='adjustable'
            accessibilityLabel={l10n.t('bag.route.sheetHandle')}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
            ]}
            onAccessibilityAction={handleAccessibilityAction}
          >
            <SheetGrabberView />
          </View>
          {header}
        </View>
      </GestureDetector>
      <View style={styles.body}>
        <BagRouteSheetContext.Provider value={contextValue}>
          {children}
        </BagRouteSheetContext.Provider>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // 지도 위에 떠 있는 면이라 그림자를 둔다. 그림자가 잘리지 않게 이 면은 `overflow`를 열어 두고 본문만 자른다.
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    boxShadow: AcgShadow.card,
  },
  handle: {
    height: SHEET_HANDLE_HEIGHT,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default BagRouteBottomSheetView;
