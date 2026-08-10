import { View, StyleSheet, Image } from 'react-native';

/**
 * 네이티브 스플래시와 같은 면. **앱 지면(`Liquid.canvas`)과 무관한 브랜드 값**이라 디자인
 * 토큰에 두지 않는다 — 스플래시는 Liquid 지면이 아니라 앱 아이콘의 연장이다.
 *
 * OTA 폴백(`app/_layout.tsx`)도 이 값을 쓴다. 두 화면이 연달아 뜨므로 값이 갈리면
 * 스플래시에서 다른 색으로 튀어 보인다 — 그래서 여기가 단일 소스다.
 */
export const SPLASH_BACKGROUND = '#151515';

const SplashLoadingView = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/splash-icon.png')}
        style={styles.icon}
        resizeMode='contain'
      />
      {/* 제작 팀 로고 — 하단 중앙(TEAM MAGMA) */}
      <Image
        source={require('../../assets/images/magma.png')}
        style={styles.teamLogo}
        resizeMode='contain'
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 240,
    height: 240,
  },
  // 하단 팀 로고 — TVING 스플래시 하단 광고처럼 크게 배치.
  teamLogo: {
    position: 'absolute',
    bottom: 96,
    width: 200,
    height: 200,
  },
});

export default SplashLoadingView;
