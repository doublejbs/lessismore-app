import { View, StyleSheet, Image } from 'react-native';

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
    backgroundColor: '#151515',
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
