import { FC, useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import PretendardText from '../PretendardText';
import { Color } from '@/constants/DesignTokens';

interface Props {
  weight: string;
  onPressBack: () => void;
  onPressAddGear: () => void;
}

const BagEditHeaderView: FC<Props> = ({
  weight,
  onPressBack,
  onPressAddGear,
}) => {
  const [displayWeight, setDisplayWeight] = useState<number>(
    parseFloat(weight) || 0
  );
  const previousWeightRef = useRef<number>(parseFloat(weight) || 0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const targetWeight = parseFloat(weight) || 0;
    const startWeight = previousWeightRef.current;
    const difference = targetWeight - startWeight;

    if (difference === 0) return;

    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const currentWeight = startWeight + difference * easeOutQuad;

      setDisplayWeight(currentWeight);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousWeightRef.current = targetWeight;
        setDisplayWeight(targetWeight);
      }
    };

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [weight]);

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={onPressBack}
          activeOpacity={0.7}
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel='뒤로가기'
        >
          <Svg width={24} height={24} viewBox='0 0 24 24' fill='none'>
            <Path
              d='M16.2844 20.475C15.9844 20.475 15.6844 20.375 15.4844 20.075L7.98438 12.575C7.48438 12.075 7.48438 11.375 7.98438 10.875L15.4844 3.375C15.9844 2.875 16.6844 2.875 17.1844 3.375C17.6844 3.875 17.6844 4.575 17.1844 5.075L10.3844 11.775L17.0844 18.475C17.5844 18.975 17.5844 19.675 17.0844 20.175C16.8844 20.375 16.5844 20.475 16.2844 20.475Z'
              fill={Color.textPrimary}
            />
          </Svg>
        </TouchableOpacity>
        <PretendardText weight='bold' style={styles.weightText}>
          {displayWeight.toFixed(2)}kg
        </PretendardText>
        {/* 장비 추가 — 상단 헤더 우측 아이콘 버튼(텍스트 없음). */}
        <TouchableOpacity
          onPress={onPressAddGear}
          activeOpacity={0.7}
          hitSlop={12}
          style={styles.addButton}
          accessibilityRole='button'
          accessibilityLabel='장비 추가'
        >
          <Svg width={24} height={24} viewBox='0 0 14 14' fill='none'>
            <Path
              d='M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z'
              fill={Color.textPrimary}
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Color.background,
    paddingVertical: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  weightText: {
    fontSize: 28,
    textAlign: 'center',
    flex: 1,
  },
  addButton: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default BagEditHeaderView;
