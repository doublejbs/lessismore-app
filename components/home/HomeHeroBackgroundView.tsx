import { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Acg, AcgLayout } from '@/constants/DesignTokens';

/**
 * 홈 상단 히어로 지면.
 *
 * 제공된 산악 그래픽은 홈 콘텐츠 뒤에 깔리는 장식 전용 이미지다. 실제 데이터나
 * 인터랙션을 담지 않으므로 접근성 트리와 터치 대상에서는 제외한다(HM-9).
 */
const HomeHeroBackgroundView: FC = () => {
  return (
    <View
      pointerEvents='none'
      accessible={false}
      style={styles.container}
      importantForAccessibility='no'
    >
      <Image
        source={require('@/assets/images/home-mountain.png')}
        style={styles.image}
        resizeMode='cover'
        accessible={false}
      />
      {/* 하단 페이드(2026-08-13 QA) — 이미지가 292pt에서 하드 컷되면 그 수평선이
          반투명 카드 안을 가로질러 이음새로 읽힌다. 지면색으로 녹여 경계를 없앤다. */}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: AcgLayout.homeHeroHeight,
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
    height: 96,
  },
});

export default HomeHeroBackgroundView;
