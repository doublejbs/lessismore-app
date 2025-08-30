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
});

export default SplashLoadingView;
