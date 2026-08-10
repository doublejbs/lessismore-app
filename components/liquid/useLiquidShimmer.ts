import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * 셔머 왕복 값. 화면마다 진폭·속도가 다르므로(스켈레톤마다 자기 값을 들고 있었다) 값은
 * 부르는 쪽이 정하고, 훅은 왕복과 생명주기만 맡는다.
 */
interface Options {
  /** 시작·복귀 투명도. `Animated.Value`의 초기값도 이 값이다. */
  from?: number | undefined;
  /** 왕복의 반대편 투명도. */
  to?: number | undefined;
  /**
   * 한 방향에 쓰는 시간. 왕복이라 한 주기는 이 값의 두 배다 — 기본 600이면 1.2s로,
   * 핸드오프 로딩 규칙의 값이다(스피너는 쓰지 않는다).
   */
  halfDuration?: number | undefined;
  /**
   * 값이 아직 도착하지 않은 동안에만 도는 자리(`LiquidStatTile`의 `loading`)를 위한 스위치.
   * 도중에 끄면 왕복이 **그 자리에 멈춘다**(cleanup의 `stop()`은 현재 값을 되돌리지 않는다) —
   * 첫 구동 전에 껐다면 아직 `from`이다. 멈춘 값이 보이면 안 되는 자리는 이 스위치가 아니라
   * 렌더 자체를 걷어야 한다.
   */
  enabled?: boolean | undefined;
}

/**
 * 스켈레톤·플레이스홀더가 공유하는 셔머 값 하나를 돌린다.
 *
 * 한 값을 여러 막대에 나눠 주면 같은 위상으로 숨 쉬므로 골격이 한 덩어리로 읽힌다 —
 * 막대마다 값을 따로 만들면 위상이 갈려 산만해진다.
 */
const useLiquidShimmer = ({
  from = 1,
  to = 0.5,
  halfDuration = 600,
  enabled = true,
}: Options = {}): Animated.Value => {
  /**
   * `useRef(...).current`를 렌더 중 읽으면 react-hooks/refs 룰에 걸리고 React Compiler가
   * 최적화를 포기한다 — 초기화 함수로 1회만 만들어 상태로 든다.
   */
  const [opacity] = useState(() => new Animated.Value(from));

  useEffect(() => {
    if (!enabled) {
      return;
    }

    /**
     * 재귀 `start(() => animate())` 대신 `loop` — 재귀는 언마운트 뒤에도 다음 주기가 스스로
     * 살아나 멈출 손잡이가 없다. loop은 cleanup에서 한 번 멈추면 끝이다.
     */
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: to,
          duration: halfDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: from,
          duration: halfDuration,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity, from, to, halfDuration, enabled]);

  return opacity;
};

export default useLiquidShimmer;
