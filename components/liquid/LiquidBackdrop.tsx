import { FC } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Liquid, LiquidBackdrop as Backdrop } from '@/constants/DesignTokens';

type Screen = keyof typeof Backdrop.veil;

interface Props {
  /** 지형 이미지·베일 농도 프리셋. 목록 화면(탐색 등)은 지형 없이 글로우만 → 'none' */
  screen: Screen | 'none';
  /** 라임 글로우 위치 — 홈·목록은 좌상단, 탐색은 우상단 */
  glowPosition?: 'topLeft' | 'topRight';
}

const GLOW_SIZE = Backdrop.glow.size;

/**
 * Liquid Depth 지면 레이어. canvas → (지형 이미지) → 그라디언트 베일 → 라임 라디얼 글로우.
 * 위쪽에서는 산세가 읽히고 아래 목록 구간은 조용해진다(핸드오프 Screens 공통).
 *
 * 화면 콘텐츠 뒤에 absoluteFill로 깐다 — ScrollView보다 먼저 그려야 하고,
 * contentInsetAdjustmentBehavior를 깨뜨리지 않게 형제로 둔다(ACG에서 배운 함정).
 */
const LiquidBackdrop: FC<Props> = ({ screen, glowPosition = 'topLeft' }) => {
  const veil = screen === 'none' ? null : Backdrop.veil[screen];
  const terrainOpacity = screen === 'none' ? 0 : Backdrop.terrain[screen];

  return (
    <View style={styles.root} pointerEvents='none'>
      {screen !== 'none' ? (
        <Image
          source={require('@/assets/images/acg-terrain.png')}
          style={[styles.terrain, { opacity: terrainOpacity }]}
          resizeMode='cover'
        />
      ) : null}

      {veil ? (
        <LinearGradient
          colors={veil.colors as unknown as [string, string, ...string[]]}
          locations={veil.locations as unknown as [number, number, ...number[]]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* 라임 라디얼 글로우 — 브랜드 색이 UI를 지배하지 않으면서 지면에 온기를 준다. */}
      <Svg
        width={GLOW_SIZE}
        height={GLOW_SIZE}
        style={[
          styles.glow,
          glowPosition === 'topLeft' ? styles.glowTopLeft : styles.glowTopRight,
        ]}
      >
        <Defs>
          <RadialGradient id='limeGlow' cx='50%' cy='50%' r='50%'>
            <Stop offset='0%' stopColor={Backdrop.glow.color} />
            <Stop
              offset={`${Backdrop.glow.fade * 100}%`}
              stopColor={Backdrop.glow.color}
              stopOpacity={0.18}
            />
            <Stop offset='100%' stopColor={Backdrop.glow.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={GLOW_SIZE / 2}
          cy={GLOW_SIZE / 2}
          r={GLOW_SIZE / 2}
          fill='url(#limeGlow)'
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Liquid.canvas,
    overflow: 'hidden',
  },
  terrain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glow: {
    position: 'absolute',
  },
  glowTopLeft: {
    top: -GLOW_SIZE * 0.35,
    left: -GLOW_SIZE * 0.3,
  },
  glowTopRight: {
    top: -GLOW_SIZE * 0.25,
    right: -GLOW_SIZE * 0.3,
  },
});

export default LiquidBackdrop;
