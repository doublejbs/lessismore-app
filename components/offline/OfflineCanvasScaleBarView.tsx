import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import { ScaleBar } from '@/model/offline/OfflineCanvasProjection';

interface Props {
  scaleBar: ScaleBar;
}

// 좌하단 축척 막대 (OF-6). 길이는 반올림한 거리(`500 m`·`2 km`)에 맞춘다.
const OfflineCanvasScaleBarView: FC<Props> = ({ scaleBar }) => {
  return (
    <View
      style={styles.container}
      pointerEvents='none'
      accessible
      accessibilityLabel={scaleBar.label}
    >
      <PretendardText style={styles.label}>{scaleBar.label}</PretendardText>
      <View style={[styles.bar, { width: scaleBar.pixels }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  // 아래가 열린 ㄷ자 막대 — 지도 축척 막대의 흔한 모양이다.
  bar: {
    height: 5,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Acg.ink,
  },
});

export default OfflineCanvasScaleBarView;
