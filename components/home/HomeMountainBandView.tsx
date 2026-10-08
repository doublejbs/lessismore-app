import { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  height: number;
  // 좌우로 이만큼 넓혀 화면 폭 가득 그린다(부모의 좌우 패딩을 상쇄).
  bleed?: number;
}

/**
 * 홈 히어로와 같은 산 일러스트를 **흐름 안의 띠**로 그린다(HM-8 비로그인 2026-10-08 · OB-14 환영 화면).
 *
 * 글자를 이 그림 위에 올리지 않는다 — 라임 산 위의 글자는 번짐을 둘러도 읽기 어렵다. 그래서 배경으로
 * 깔지 않고 글자 앞·뒤의 띠로 둔다. 아래는 홈 히어로와 같은 페이드로 지면에 녹인다(새 그라데이션 없음).
 * 장식이라 접근성 트리·터치에서 뺀다.
 */
const HomeMountainBandView: FC<Props> = ({ height, bleed = 0 }) => {
  return (
    <View
      pointerEvents='none'
      accessible={false}
      importantForAccessibility='no-hide-descendants'
      style={[styles.container, { height, marginHorizontal: -bleed }]}
    >
      <Image
        source={require('@/assets/images/home-mountain.png')}
        style={styles.image}
        resizeMode='cover'
        accessible={false}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', Acg.paper]}
        style={styles.bottomFade}
        pointerEvents='none'
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Acg.paper,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
});

export default HomeMountainBandView;
