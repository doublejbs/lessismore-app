import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  duration?: number;
}

const LoadingView = ({ duration = 2000 }: Props) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const dashValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 회전 애니메이션
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 대시 애니메이션
    const dashAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(dashValue, {
          toValue: 1,
          duration: duration * 0.375,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(dashValue, {
          toValue: 2,
          duration: duration * 0.375,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    rotateAnimation.start();
    dashAnimation.start();

    return () => {
      rotateAnimation.stop();
      dashAnimation.stop();
    };
  }, [duration]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.svgContainer, { transform: [{ rotate }] }]}>
        <Svg width='24' height='24' viewBox='0 0 24 24'>
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
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingView;
