import React from 'react';
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
    width: 200,
    height: 200,
  },
  teamLogo: {
    position: 'absolute',
    bottom: 56,
    width: 120,
    height: 120,
  },
});

export default SplashLoadingView;
