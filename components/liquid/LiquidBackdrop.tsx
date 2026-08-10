import { FC } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Liquid, LiquidBackdrop as Backdrop } from '@/constants/DesignTokens';

type Screen = keyof typeof Backdrop.veil;

interface Glow {
  size: number;
  /** 'rgb(r,g,b)' — 알파는 opacity로 준다(react-native-svg가 rgba 문자열을 일관되게 못 읽는다). */
  rgb: string;
  opacity: number;
  top: number;
  left?: number;
  right?: number;
}

interface Props {
  /** 지형 이미지·베일 농도 프리셋. 목록 화면(탐색 등)은 지형 없이 글로우만 → 'none' */
  screen: Screen | 'none';
  /** 라임 글로우 위치 — 홈·목록은 좌상단, 탐색은 우상단 */
  glowPosition?: 'topLeft' | 'topRight';
  /** 홈처럼 보조 글로우가 더 필요한 화면에서만 켠다 */
  coolGlow?: boolean;
}

// 목업 값 그대로 — 좌상단 라임 340, 우측 파랑 300(top 180).
const LIME_GLOW: Record<'topLeft' | 'topRight', Glow> = {
  topLeft: {
    size: Backdrop.glow.size,
    rgb: 'rgb(200,242,68)',
    opacity: 0.5,
    top: -60,
    left: -80,
  },
  // 탐색처럼 지형 없이 글로우만 쓰는 화면 — 지면이 밝아 한 단계 옅게 둔다(목업 탐색 절).
  topRight: {
    size: 320,
    rgb: 'rgb(200,242,68)',
    opacity: 0.4,
    top: -70,
    right: -90,
  },
};

const COOL_GLOW: Glow = {
  size: 300,
  rgb: 'rgb(120,150,255)',
  opacity: 0.22,
  top: 180,
  right: -100,
};

/**
 * Liquid Depth 지면 레이어. canvas → (지형 이미지) → 그라디언트 베일 → 라디얼 글로우.
 * 위쪽에서는 산세가 읽히고 아래 목록 구간은 조용해진다(핸드오프 Screens 공통).
 *
 * 화면 콘텐츠 뒤에 형제로 깐다 — ScrollView 안에 넣으면
 * `contentInsetAdjustmentBehavior`가 깨진다(ACG 이식에서 겪은 함정).
 */
const LiquidBackdrop: FC<Props> = ({
  screen,
  glowPosition = 'topLeft',
  coolGlow = false,
}) => {
  const veil = screen === 'none' ? null : Backdrop.veil[screen];
  const terrainOpacity = screen === 'none' ? 0 : Backdrop.terrain[screen];

  const renderGlow = (glow: Glow, id: string) => (
    <Svg
      key={id}
      width={glow.size}
      height={glow.size}
      style={[
        styles.glow,
        {
          top: glow.top,
          ...(glow.left !== undefined ? { left: glow.left } : {}),
          ...(glow.right !== undefined ? { right: glow.right } : {}),
        },
      ]}
    >
      <Defs>
        <RadialGradient id={id} cx='50%' cy='50%' r='50%'>
          <Stop offset='0%' stopColor={glow.rgb} stopOpacity={glow.opacity} />
          {/* 목업과 같이 70%에서 완전히 사라진다 — 중간 스톱을 두면 원 가장자리가 띠로 보인다. */}
          <Stop
            offset={`${Backdrop.glow.fade * 100}%`}
            stopColor={glow.rgb}
            stopOpacity={0}
          />
        </RadialGradient>
      </Defs>
      <Circle
        cx={glow.size / 2}
        cy={glow.size / 2}
        r={glow.size / 2}
        fill={`url(#${id})`}
      />
    </Svg>
  );

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

      {/* 라임 글로우 하나가 브랜드 온기를 맡는다 — UI를 지배하지 않게 지면 모서리에만 둔다. */}
      {renderGlow(LIME_GLOW[glowPosition], 'liquidLimeGlow')}
      {coolGlow ? renderGlow(COOL_GLOW, 'liquidCoolGlow') : null}
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
});

export default LiquidBackdrop;
