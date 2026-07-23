import { FC, useEffect, useRef, useState } from 'react';
import { TextStyle } from 'react-native';
import PretendardText from '../PretendardText';

interface Props {
  weight: string;
  // 표시 폰트 크기 — 커스텀 헤더(Android/Web)는 28, iOS 네이티브 헤더 타이틀은 17을 쓴다.
  fontSize: number;
  style?: TextStyle | undefined;
}

// 배낭 편집 헤더의 무게 카운트업 애니메이션 타이틀(LG-2 C).
// iOS 네이티브 headerTitle 커스텀 컴포넌트와 Android/Web 커스텀 헤더가 공유한다.
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
    <PretendardText weight='bold' style={[{ fontSize }, style]}>
      {displayWeight.toFixed(2)}kg
    </PretendardText>
  );
};

export default BagEditWeightTitleView;
