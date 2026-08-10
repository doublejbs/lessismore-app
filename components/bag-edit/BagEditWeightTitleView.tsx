import { FC, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import PretendardText from '../PretendardText';
import { Liquid, LiquidFont } from '@/constants/DesignTokens';

interface Props {
  weight: string;
  // 표시 폰트 크기 — 커스텀 헤더(Android/Web)는 28, iOS 네이티브 헤더 타이틀은 17을 쓴다.
  fontSize: number;
  style?: TextStyle | undefined;
}

// 배낭 편집 헤더의 무게 카운트업 애니메이션 타이틀(LG-2 C).
// iOS 네이티브 headerTitle 커스텀 컴포넌트와 Android/Web 커스텀 헤더가 공유한다.
// 숫자 + 라틴 단위(`8.40kg`)뿐이라 콘덴스드를 쓴다 — Archivo Narrow에 한글 글리프는 없지만
// 이 문자열에는 한글이 들어오지 않는다(Liquid Depth 무게 표기 규칙).
const BagEditWeightTitleView: FC<Props> = ({ weight, fontSize, style }) => {
  const [displayWeight, setDisplayWeight] = useState<number>(
    parseFloat(weight) || 0
  );
  const previousWeightRef = useRef<number>(parseFloat(weight) || 0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const targetWeight = parseFloat(weight) || 0;
    const startWeight = previousWeightRef.current;
    const difference = targetWeight - startWeight;

    if (difference === 0) {
      return;
    }

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
    <PretendardText style={[styles.weight, { fontSize }, style]}>
      {displayWeight.toFixed(2)}kg
    </PretendardText>
  );
};

const styles = StyleSheet.create({
  weight: {
    fontFamily: LiquidFont.condensed,
    color: Liquid.ink,
  },
});

export default BagEditWeightTitleView;
