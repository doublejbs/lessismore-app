import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  readonly visible: boolean;
  /** 막 탭 · Android 뒤로가기 · 스와이프 닫기가 부른다 */
  readonly onRequestClose: () => void;
  readonly children: ReactNode;
  /** 키보드를 피해야 하는 입력 시트(로그인 이메일 모드·닉네임 편집) */
  readonly avoidKeyboard?: boolean;
  /** 아래로 스와이프해 닫기(공지 시트 AN-2) */
  readonly swipeToDismiss?: boolean;
  /** 막 버튼 라벨 — 무엇이 닫히는지 말한다 */
  readonly closeAccessibilityLabel: string;
}

/**
 * 시트가 아래에서 올라오는 거리. 화면 높이를 재지 않는다 — 측정하면 첫 프레임이 한 박자
 * 늦고, 막과 시트를 함께 페이드하므로 이 거리로 덮이지 않는 부분은 눈에 걸리지 않는다.
 * 공지 시트가 쓰던 값을 그대로 가져왔다.
 */
const SHEET_OFFSET = 320;

/**
 * 나갈 때만 timing으로 짧게 끊는다. 스프링으로 되돌리면 이미 끝낸 일을 기다리게 되어
 * 닫기가 늘어진다 — 들어올 때(무게를 느껴야 한다)와 나갈 때(빨리 비켜야 한다)의 성격이 다르다.
 */
const EXIT_DURATION = 200;

// 스와이프로 닫는 판정 임계값 — 아래로 이만큼 끌거나(px) 아래 방향 속도가 빠르면 닫는다.
const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.5;

// 세로 의도가 분명해진 뒤에 시트를 잡는다(가로 스와이프·탭과 갈린다).
const SWIPE_START_SLOP = 5;

/**
 * RN `Modal` 기반 바텀 시트의 전환을 맡는 프리미티브 (Liquid Depth).
 *
 * **막과 슬라이드 컨테이너까지만 소유하고 시트 면은 children으로 받는다** — 소비처마다 면이
 * 다르다(로그인·공지는 유리 시트 `LiquidBottomSheet`, 바텀 메뉴·박지 배낭 선택은 지면 위
 * 종이 카드). 면까지 껴안으면 프리미티브가 화면마다 갈라진다.
 *
 * **닫힘 애니메이션이 그동안 재생되지 않던 문제를 여기서 고친다**: `<Modal visible={visible}>`은
 * `visible`이 false가 되는 순간 언마운트돼, 소비처가 작성해 둔 slide-down/fade-out이 화면에
 * 닿지 않았다. 마운트 여부를 따로 들고 **나가는 애니메이션이 끝난 뒤에** 내린다.
 */
const LiquidSheetModal: FC<Props> = ({
  visible,
  onRequestClose,
  children,
  avoidKeyboard = false,
  swipeToDismiss = false,
  closeAccessibilityLabel,
}) => {
  // Modal을 살려 두는 창. `visible`이 꺼져도 나가는 애니메이션이 끝날 때까지 내리지 않는다.
  const [mounted, setMounted] = useState(visible);

  /**
   * `visible`이 켜지는 순간을 **렌더 중에** 잡는다(React의 prop 변화 보정 패턴). effect에서
   * 올리면 마운트가 한 프레임 늦어 첫 프레임이 비고, cascading render도 생긴다.
   */
  const [wasVisible, setWasVisible] = useState(visible);

  if (wasVisible !== visible) {
    setWasVisible(visible);

    if (visible) {
      setMounted(true);
    }
  }

  /**
   * 구동 값은 하나다(0=숨김 → 1=보임). 막 투명도와 시트 위치를 같은 값에서 뽑아
   * 둘이 어긋나지 않게 한다. `Animated.Value`를 ref로 잡으면 렌더 중 `.current`를 읽게 되므로
   * 상태로 든다.
   */
  const [progress] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() =>
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [SHEET_OFFSET, 0],
    })
  );

  /**
   * 아래로 끌어 닫는 제스처. `onRequestClose`는 소비처에서 렌더마다 새로 만들어지므로 최신
   * 값을 잡으려면 의존성에 둘 수밖에 없다 — ref로 우회하면 렌더 중 ref 접근이 된다
   * (`react-hooks/refs`). 핸들러 객체가 드래그 도중 바뀌면 누적 이동량이 초기화되니,
   * 드래그 중에는 리렌더를 만들지 않는다(제스처는 React 상태가 아니라 `progress`만 움직인다).
   */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > SWIPE_START_SLOP && gesture.dy > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          // 손가락이 내려간 만큼 진행도를 되감는다. 위로 끌면 1에 잠겨 시트가 늘어나지 않는다.
          const next = 1 - gesture.dy / SHEET_OFFSET;

          progress.setValue(Math.min(1, Math.max(0, next)));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (
            gesture.dy > SWIPE_CLOSE_DISTANCE ||
            gesture.vy > SWIPE_CLOSE_VELOCITY
          ) {
            onRequestClose();

            return;
          }

          // 되돌아오는 스프링에도 `overshootClamping`을 건다(공용 모션 토큰) — 시트가 제자리를
          // 지나쳤다 돌아오면 손을 뗀 위치가 잘못 읽힌 것처럼 보인다.
          Animated.spring(progress, {
            toValue: 1,
            ...LiquidMotion.spring,
            useNativeDriver: true,
          }).start();
        },
      }),
    [progress, onRequestClose]
  );

  useEffect(() => {
    if (visible) {
      /**
       * 들어올 때는 스프링 — 시트가 무게를 갖고 올라온다. `overshootClamping`은 공용 모션
       * 토큰에 이미 있고 반드시 유지한다(제자리를 지나쳤다 돌아오면 튄 것처럼 보인다).
       */
      const enter = Animated.spring(progress, {
        toValue: 1,
        ...LiquidMotion.spring,
        useNativeDriver: true,
      });

      enter.start();

      return () => {
        enter.stop();
      };
    }

    // 닫힌 채로 처음 렌더될 때는 0 → 0이라 아무 일도 하지 않는다(마운트도 되어 있지 않다).
    const exit = Animated.timing(progress, {
      toValue: 0,
      duration: EXIT_DURATION,
      useNativeDriver: true,
    });

    exit.start(({ finished }) => {
      // 나가는 중 다시 열리면 아래 cleanup이 stop()해 `finished`가 false다 — 그때는 내리지 않고
      // 위 분기가 진행 중인 나가기를 되돌린다.
      if (finished) {
        setMounted(false);
      }
    });

    return () => {
      exit.stop();
    };
  }, [visible, progress]);

  if (!mounted) {
    return null;
  }

  /**
   * 스와이프를 받는 자리. `box-none`인 홀더는 스스로 터치를 받지 못하므로 제스처를 걸 면이
   * 따로 필요하다 — 필요할 때만 감싸, 그렇지 않은 시트는 자식이 홀더의 직계로 남는다
   * (`maxHeight: '85%'` 같은 퍼센트 높이가 확정 높이 부모를 잃지 않게).
   */
  const body = swipeToDismiss ? (
    <View {...panResponder.panHandlers}>{children}</View>
  ) : (
    children
  );

  /**
   * 슬라이드 컨테이너. 화면을 채우고 자식을 아래에 붙여, 자식이 퍼센트 높이를 쓰더라도
   * 확정 높이 부모를 갖는다. `box-none`이라 시트가 덮지 않는 자리의 탭은 막으로 지나간다.
   */
  const holder = (
    <Animated.View
      style={[styles.holder, { transform: [{ translateY }] }]}
      pointerEvents='box-none'
    >
      {body}
    </Animated.View>
  );

  return (
    <Modal
      visible={mounted}
      transparent
      // 안드로이드는 이 값이 없으면 딤이 상태바 아래에서 끊겨 지면이 비친다(로그인 시트 선례).
      statusBarTranslucent
      // 전환은 이 컴포넌트가 그린다. RN 기본 'slide'는 막까지 함께 밀어 올려 어색하다.
      animationType='none'
      onRequestClose={onRequestClose}
    >
      {/**
       * 막과 시트를 한 컨테이너에서 함께 페이드한다 — `SHEET_OFFSET`은 키 큰 시트를 완전히
       * 화면 밖으로 내보내지 못하므로, 페이드가 없으면 열릴 때 시트 윗부분이 미리 비치고
       * 닫힐 때 남은 부분이 툭 사라진다.
       */}
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        {/* 시트 밖을 눌러 닫는다. 라벨이 무엇이 닫히는지 말한다. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onRequestClose}
          accessibilityRole='button'
          accessibilityLabel={closeAccessibilityLabel}
        />

        {avoidKeyboard ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.holder}
            pointerEvents='box-none'
          >
            {holder}
          </KeyboardAvoidingView>
        ) : (
          holder
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Liquid.scrim,
  },
  holder: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});

export default LiquidSheetModal;
