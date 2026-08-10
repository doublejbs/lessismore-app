import { FC, useEffect, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';
import LoadingView from '@/components/ui/LoadingView';

/**
 * 담기 CTA 원형 지름과 터치 여유.
 *
 * 32pt로 그리되 HIG 최소 타깃 44×44pt를 만족시켜야 한다 — 시각 크기를 키우면 카드·행이
 * 버튼에 눌리므로 여유로만 확보한다. (44 − 32) / 2 = 6.
 */
const CTA_SIZE = 32;
const CTA_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

// 인플라이트 스피너 한 바퀴.
const SPINNER_DURATION = 1000;

// 담김 ↔ 미담김 전환 시간(핸드오프 Interactions: 아이콘 크로스페이드 150ms).
const CROSSFADE_DURATION = 150;

interface Props {
  /** true면 담김 = 잉크 면 + 라임 체크, false면 미담김 = 라임 면 + add */
  added: boolean;
  /** 담기·빼기 요청 중 — 잉크 면 위에 라임 스피너를 둔다 */
  loading?: boolean;
  /**
   * 없으면 **정보 배지**로 그린다(누를 수 없음).
   * 배낭 컨텍스트에서 이미 그 배낭에 담긴 장비처럼, 상태만 알리고 파괴적 동작을 노출하지
   * 않는 자리에 쓴다.
   */
  onPress?: ((e: GestureResponderEvent) => void) | undefined;
  /** 아이콘 전용 컨트롤이라 라벨이 없으면 무엇을 누르는지 드러나지 않는다 */
  accessibilityLabel?: string | undefined;
}

/**
 * 탐색·검색·순위가 공유하는 담기 CTA(핸드오프 §2·§3).
 *
 * **미담김 = 라임 면 + `add` / 담김 = 잉크 면 + 라임 `checkmark`** 로 면이 뒤집힌다 —
 * 이 앱에서 라임은 "아직 내 것이 아님"을 뜻하는 자리라, 담긴 항목에서 라임 면이 사라져야
 * 목록을 훑을 때 남은 것만 눈에 걸린다.
 */
const LiquidAddCta: FC<Props> = ({
  added,
  loading = false,
  onPress,
  accessibilityLabel,
}) => {
  /**
   * 0 = 미담김, 1 = 담김.
   *
   * 아이콘만 페이드시키고 면은 즉시 뒤집으면, 전환 150ms 동안 잉크 면 위에 잉크색
   * `add`(limeOn)가 얹혀 아이콘이 사라진다. 그래서 면을 얹은 라임 레이어째로 함께
   * 페이드해 아이콘 교차가 항상 보이게 한다 — 잉크 면은 늘 아래에 깔려 있다.
   *
   * ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler가 최적화를 포기하므로 상태로 든다.
   */
  const [progress] = useState(() => new Animated.Value(added ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: added ? 1 : 0,
      duration: CROSSFADE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [added, progress]);

  const idleOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const renderFace = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <LoadingView duration={SPINNER_DURATION} color={Liquid.lime} />
        </View>
      );
    }

    return (
      <>
        {/* 담김 — 잉크 면 위 라임 체크. */}
        <Animated.View style={[styles.center, { opacity: progress }]}>
          <Ionicons name='checkmark' size={18} color={Liquid.lime} />
        </Animated.View>

        {/* 미담김 — 라임 면 + 잉크 add. 위에 얹혀 있다가 담기면 걷힌다. */}
        <Animated.View
          style={[styles.center, styles.idleFace, { opacity: idleOpacity }]}
        >
          <Ionicons name='add' size={18} color={Liquid.limeOn} />
        </Animated.View>
      </>
    );
  };

  if (!onPress) {
    return (
      <View
        style={styles.cta}
        accessible={!!accessibilityLabel}
        {...(accessibilityLabel ? { accessibilityLabel } : {})}
      >
        {renderFace()}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.cta}
      onPress={onPress}
      // 요청 왕복 중 재탭이 registerSingle을 중복 호출해 gear-rank count가 두 번 움직인다.
      disabled={loading}
      hitSlop={CTA_HIT_SLOP}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityState={{ disabled: loading, selected: added }}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
    >
      {renderFace()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 잉크 면이 바탕 — 라임 레이어가 걷혀도 원이 비지 않는다.
  cta: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Liquid.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 두 상태를 같은 자리에 겹쳐 두고 투명도로만 교차시킨다.
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleFace: {
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Liquid.lime,
  },
});

export default LiquidAddCta;
