import { FC, ReactNode, useState } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// 자식 글자 둘레에 남길 여백. 펜 자국이 글자에 닿지 않게 띄운다.
const PADDING_H = 12;
const PADDING_V = 6;
// 원의 두께. 지면 위에서 라임 한 겹이 얇으면 묻힌다.
const STROKE = 2.6;

/**
 * 손으로 그린 듯한 라임 동그라미(ACG) — 강조하고 싶은 수치 하나에 두른다.
 *
 * 자식 크기를 `onLayout`으로 재서 그 둘레에 타원을 그린다. 완전한 타원이 아니라 **한 바퀴를
 * 살짝 넘겨 끝내는** 형태이고, 네 구간의 제어점을 조금씩 어긋나게 둬 손그림처럼 보이게 한다.
 * 값은 고정이라 렌더마다 흔들리지 않는다(난수를 쓰면 리렌더 때 모양이 바뀐다).
 */
const AcgPenCircleView: FC<Props> = ({ children, style }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  return (
    <View style={[styles.wrap, style]} onLayout={handleLayout}>
      {size.width > 0 ? (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          pointerEvents='none'
        >
          <Path
            d={buildPath(size.width, size.height)}
            stroke={Acg.lime}
            strokeWidth={STROKE}
            strokeLinecap='round'
            fill='none'
          />
        </Svg>
      ) : null}
      {children}
    </View>
  );
};

// 타원 근사 상수(원을 베지에 4구간으로 그릴 때의 비율).
const KAPPA = 0.5523;

const buildPath = (width: number, height: number): string => {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - STROKE;
  const ry = height / 2 - STROKE;
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;

  // 왼쪽 가운데에서 시작해 시계 방향으로 한 바퀴. 구간마다 반지름을 1~3% 흔들어
  // 손으로 그은 티를 낸다.
  return [
    `M ${cx - rx} ${cy + 2}`,
    `C ${cx - rx} ${cy - oy * 1.05} ${cx - ox} ${cy - ry * 1.02} ${cx} ${cy - ry}`,
    `C ${cx + ox * 1.05} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx * 0.98} ${cy}`,
    `C ${cx + rx * 0.98} ${cy + oy} ${cx + ox} ${cy + ry * 1.03} ${cx} ${cy + ry}`,
    `C ${cx - ox * 1.08} ${cy + ry} ${cx - rx * 1.02} ${cy + oy} ${cx - rx * 0.99} ${cy - 3}`,
    // 시작점을 지나 조금 더 그어 끝낸다 — 펜을 뗀 자리를 남긴다.
    `C ${cx - rx * 0.96} ${cy - oy * 0.9} ${cx - ox * 0.8} ${cy - ry * 0.92} ${cx + ox * 0.35} ${cy - ry * 0.86}`,
  ].join(' ');
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: PADDING_H,
    paddingVertical: PADDING_V,
  },
});

export default AcgPenCircleView;
