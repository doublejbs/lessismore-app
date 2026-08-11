import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const LoadingIconView = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    };

    startRotation();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <AnimatedSvg
        width={24}
        height={24}
        viewBox='0 0 24 24'
        style={{
          transform: [{ rotate }],
        }}
      >
        <G>
          <Circle
            cx='12'
            cy='12'
            r='9.5'
            fill='none'
            stroke='#000'
            strokeWidth='3'
            strokeLinecap='round'
            strokeDasharray='42 150'
            strokeDashoffset='-16'
          />
        </G>
      </AnimatedSvg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingIconView;
