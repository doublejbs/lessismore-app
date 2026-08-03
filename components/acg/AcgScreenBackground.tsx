import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
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
 * **앱 전 화면이 같은 배경을 쓴다**(2026-08-03 사용자 결정). 한때 홈·정보 탭만 디자이너
 * 원본 지형 PNG를 깔았는데, 같은 앱 안에서 화면마다 지면이 달라 보였다. 이미지 없이
 * SVG로만 그리는 이 배경 하나로 통일한다.
 *
 * 그레인은 CSS `radial-gradient` 두 겹인데 RN에 없어 SVG `Pattern`으로 낸다.
 */
const AcgScreenBackground: FC = () => {
  return (
    <View style={styles.container} pointerEvents='none'>
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
          stroke={Acg.limeText}
          strokeOpacity={0.55}
          strokeWidth={1.6}
          fill='none'
          strokeLinecap='round'
        />
        <Path
          d='M314 528 l-3 13 l11 -6z'
          fill={Acg.limeText}
          fillOpacity={0.55}
        />
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
});

export default AcgScreenBackground;
