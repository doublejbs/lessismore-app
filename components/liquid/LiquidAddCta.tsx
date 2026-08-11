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
  /** true면 담김 = 라임 면 + 잉크 체크, false면 미담김 = 무채색 아웃라인 원 + 잉크 add */
  added: boolean;
  /** 담기·빼기 요청 중 — 아웃라인 원 안에 잉크 스피너를 둔다 */
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
 * **미담김 = 무채색 아웃라인 원 + 잉크 `add` / 담김 = 라임 면 + 잉크 `checkmark`**
 * (2026-08-11 디자인 리뷰로 뒤집힘 — 핸드오프 §2의 반대다).
 *
 * 라임은 **"담긴 것"** 하나만 뜻한다. 뒤집기 전에는 미담김이 라임 면이라 탐색 그리드 한
 * 화면에 라임 원이 12개 떠서 액센트가 아무것도 가리키지 않았다 — 액센트는 드물어야 액센트다.
 * 미담김은 아직 아무 일도 일어나지 않은 상태이므로 조용한 아웃라인이 맞고, 담김은 내가 남긴
 * 표시이므로 라임 면이 맞다. 담긴 항목을 훑어 찾는 것도 이쪽이 쉽다.
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
   * 두 상태를 **면째로** 겹쳐 두고 투명도만 교차시킨다 — 아이콘만 페이드시키고 면을 즉시
   * 뒤집으면 전환 150ms 동안 아이콘과 면의 짝이 어긋나(라임 면 위에 add, 아웃라인 위에 체크)
   * 글리프가 한 번 사라져 보인다.
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
        <View style={[styles.center, styles.idleFace]}>
          <LoadingView duration={SPINNER_DURATION} color={Liquid.ink} />
        </View>
      );
    }

    return (
      <>
        {/* 미담김 — 무채색 아웃라인 원 + 잉크 add. */}
        <Animated.View
          style={[styles.center, styles.idleFace, { opacity: idleOpacity }]}
        >
          <Ionicons name='add' size={18} color={Liquid.ink} />
        </Animated.View>

        {/* 담김 — 라임 면 + 잉크 체크. 위에 얹혀 있다가 빼면 걷힌다. */}
        <Animated.View
          style={[styles.center, styles.addedFace, { opacity: progress }]}
        >
          <Ionicons name='checkmark' size={18} color={Liquid.limeOn} />
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
  // 자리만 잡는 껍데기 — 면은 두 상태 레이어가 각자 든다.
  cta: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
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
    borderRadius: CTA_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 미담김 — 아직 아무 일도 없었다는 뜻이라 채우지 않고 테두리만 두른다(빈 체크 원과 같은 값).
  idleFace: {
    borderWidth: 1,
    borderColor: Liquid.inkFaint,
    backgroundColor: Liquid.surface,
  },
  addedFace: {
    backgroundColor: Liquid.lime,
  },
});

export default LiquidAddCta;
