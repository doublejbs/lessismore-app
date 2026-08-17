import { FC } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Pattern,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Acg } from '@/constants/DesignTokens';

/**
 * 앱 공통 지면 레이어(ACG) — 지면색 + 그레인 + 와이어프레임 지형 마크.
 *
 * 지면 위에 시안 SVG의 측량 요소 — 십자 마크, 구역 문자(A/B/C), 라임 트레일 곡선 — 만 얹는다.
 *
 * 기본은 이 SVG 지면이고, **홈·정보 탭만 `photo`로 디자이너 원본 지형 PNG를 깐다**
 * (2026-08-04 사용자 결정). 두 화면은 면이 크고 성겨서 지형이 콘텐츠를 이기지 않는다.
 *
 * 그레인은 CSS `radial-gradient` 두 겹인데 RN에 없어 SVG `Pattern`으로 낸다.
 */
interface Props {
  // 원본 지형 PNG를 지면 위에 깐다(홈·정보 탭). 이미지에 측량 마크가 이미 들어 있어
  // SVG 마크와 겹치므로 켤 때는 `terrain={false}`를 함께 넘긴다.
  photo?: boolean;
  terrain?: boolean;
}

// 원본 그대로(1.0)는 격자가 콘텐츠보다 세게 읽혔다. 지면색이 비쳐 종이 질감으로 가라앉는 값.
const TERRAIN_OPACITY = 0.5;

const AcgScreenBackground: FC<Props> = ({ photo = false, terrain = true }) => {
  return (
    <View style={styles.container} pointerEvents='none'>
      {photo ? (
        <Image
          source={require('@/assets/images/acg-terrain.png')}
          style={styles.terrainPhoto}
          resizeMode='cover'
        />
      ) : null}
      <Svg width='100%' height='100%' viewBox='0 0 402 874'>
        <Defs>
          {/* 시안의 3px / 5px 두 겹 도트를 각각 한 패턴으로 낸다. */}
          <Pattern
            id='grainA'
            width={3}
            height={3}
            patternUnits='userSpaceOnUse'
          >
            <Circle
              cx={0.5}
              cy={0.5}
              r={0.5}
              fill={Acg.ink}
              fillOpacity={0.09}
            />
          </Pattern>
          <Pattern
            id='grainB'
            width={5}
            height={5}
            patternUnits='userSpaceOnUse'
            x={1}
            y={2}
          >
            <Circle
              cx={0.5}
              cy={0.5}
              r={0.5}
              fill={Acg.ink}
              fillOpacity={0.06}
            />
          </Pattern>
        </Defs>

        <Rect x={0} y={0} width={402} height={874} fill='url(#grainA)' />
        <Rect x={0} y={0} width={402} height={874} fill='url(#grainB)' />

        {terrain ? (
          <>
            {/* 십자 측량 마크 */}
            <G stroke={Acg.ink} strokeOpacity={0.22} strokeWidth={1}>
              <Path d='M28 214h14M35 207v14M356 470h14M363 463v14M40 690h14M47 683v14' />
            </G>
            {/* 구역 문자 */}
            <G fill={Acg.ink} fillOpacity={0.3}>
              <SvgText x={352} y={196} fontSize={9}>
                A
              </SvgText>
              <SvgText x={24} y={452} fontSize={9}>
                B
              </SvgText>
              <SvgText x={352} y={742} fontSize={9}>
                C
              </SvgText>
            </G>
            {/* 라임 트레일 곡선 + 진행 방향 화살촉 */}
            <Path
              d='M300 592 c26 -12 32 -44 14 -62'
              stroke={Acg.ink}
              strokeOpacity={0.55}
              strokeWidth={1.6}
              fill='none'
              strokeLinecap='round'
            />
            <Path
              d='M314 528 l-3 13 l11 -6z'
              fill={Acg.ink}
              fillOpacity={0.55}
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.bg,
  },
  terrainPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: TERRAIN_OPACITY,
  },
});

export default AcgScreenBackground;
