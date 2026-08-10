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

/** 글로우 자리. 화면마다 지면 구성이 달라 세기까지 같이 갈린다(아래 LIME_GLOW). */
type GlowPosition = 'topLeft' | 'topRight' | 'leftMid';

interface Props {
  /** 지형 이미지·베일 농도 프리셋. 목록 화면(탐색 등)은 지형 없이 글로우만 → 'none' */
  screen: Screen | 'none';
  /** 라임 글로우 자리 — 홈·목록은 좌상단, 탐색은 우상단, 배낭 상세는 좌측 중단 */
  glowPosition?: GlowPosition;
  /**
   * 라임 글로우를 끌 때 false. 패킹 모드(목업 §7)는 지형 + 강한 베일만 쓴다 — 유리 진행
   * 카드가 지면 최상단(헤더 바로 아래)에 앉아, 모서리 글로우가 그 카드 뒤에서 얼룩으로
   * 읽힌다. 아래 `coolGlow`는 이 값과 무관하게 따로 켠다.
   */
  limeGlow?: boolean;
  /** 홈처럼 보조 글로우가 더 필요한 화면에서만 켠다 */
  coolGlow?: boolean;
}

// 목업 값 그대로 — 좌상단 라임 340, 우측 파랑 300(top 180).
const LIME_GLOW: Record<GlowPosition, Glow> = {
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
  /**
   * 배낭 상세(목업 §6) — 글로우가 화면 안쪽(top 120)으로 내려와 있고 세기도 가장 낮다.
   * 이 화면은 지형 0.8 + 짙은 베일 위에 흰 히어로 카드가 얹히므로, 모서리에서 강하게
   * 번지면 카드 뒤가 얼룩처럼 읽힌다.
   */
  leftMid: {
    size: 300,
    rgb: 'rgb(200,242,68)',
    opacity: 0.35,
    top: 120,
    left: -60,
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
  limeGlow = true,
  coolGlow = false,
}) => {
  const veil = screen === 'none' ? null : Backdrop.veil[screen];
  const terrainOpacity = screen === 'none' ? 0 : Backdrop.terrain[screen];

  const renderGlow = (spec: Glow, id: string) => (
    <Svg
      key={id}
      width={spec.size}
      height={spec.size}
      style={[
        styles.glow,
        {
          top: spec.top,
          ...(spec.left !== undefined ? { left: spec.left } : {}),
          ...(spec.right !== undefined ? { right: spec.right } : {}),
        },
      ]}
    >
      <Defs>
        <RadialGradient id={id} cx='50%' cy='50%' r='50%'>
          <Stop offset='0%' stopColor={spec.rgb} stopOpacity={spec.opacity} />
          {/* 목업과 같이 70%에서 완전히 사라진다 — 중간 스톱을 두면 원 가장자리가 띠로 보인다. */}
          <Stop
            offset={`${Backdrop.glow.fade * 100}%`}
            stopColor={spec.rgb}
            stopOpacity={0}
          />
        </RadialGradient>
      </Defs>
      <Circle
        cx={spec.size / 2}
        cy={spec.size / 2}
        r={spec.size / 2}
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
      {limeGlow ? renderGlow(LIME_GLOW[glowPosition], 'liquidLimeGlow') : null}
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
