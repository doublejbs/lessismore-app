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
 * 탭 5화면의 지면 레이어(ACG) — 지면색 + 그레인 + 와이어프레임 지형 마크.
 *
 * 지면 위에 시안 SVG의 측량 요소 — 십자 마크, 구역 문자(A/B/C), 라임 트레일 곡선 — 만 얹는다.
 *
 * 디자이너 원본 지형 PNG(`assets/images/acg-terrain.png`)를 깔아 봤으나 **되돌렸다**
 * (2026-08-03 실기기 확인). 카드가 촘촘한 화면(탐색·배낭)에서 카드 사이 틈으로 격자와
 * 라임 트레일이 대각선으로 지나가 목록을 훑기 어려웠다. 배경이 콘텐츠를 이겨서는 안 된다.
 * 다시 쓰려면 이 컴포넌트에 `<Image>` 한 겹을 SVG 아래 얹으면 된다 — 그때는 투명도를
 * 충분히 낮춰야 한다(0.9로는 시끄러웠다).
 *
 * 그레인은 CSS `radial-gradient` 두 겹인데 RN에 없어 SVG `Pattern`으로 낸다.
 * 상세 화면은 지형 없이 지면 + 그레인만 쓰므로 `terrain={false}`로 끈다.
 */
interface Props {
  terrain?: boolean;
}

const AcgScreenBackground: FC<Props> = ({ terrain = true }) => {
  return (
    <View style={styles.container} pointerEvents='none'>

      <Svg width='100%' height='100%' viewBox='0 0 402 874'>
        <Defs>
          {/* 시안의 3px / 5px 두 겹 도트를 각각 한 패턴으로 낸다. */}
          <Pattern id='grainA' width={3} height={3} patternUnits='userSpaceOnUse'>
            <Circle cx={0.5} cy={0.5} r={0.5} fill={Acg.ink} fillOpacity={0.09} />
          </Pattern>
          <Pattern
            id='grainB'
            width={5}
            height={5}
            patternUnits='userSpaceOnUse'
            x={1}
            y={2}
          >
            <Circle cx={0.5} cy={0.5} r={0.5} fill={Acg.ink} fillOpacity={0.06} />
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
              stroke={Acg.limeText}
              strokeOpacity={0.55}
              strokeWidth={1.6}
              fill='none'
              strokeLinecap='round'
            />
            <Path d='M314 528 l-3 13 l11 -6z' fill={Acg.limeText} fillOpacity={0.55} />
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
});

export default AcgScreenBackground;
