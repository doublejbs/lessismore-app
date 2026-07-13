import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Color } from '@/constants/DesignTokens';

// 별점 시맨틱색 — 토큰이 아닌 별점 전용 색이라 하드코딩 허용(CLAUDE.md 예외 규정).
const STAR_FILLED_COLOR = '#FFB300';

interface Props {
  rating: number;
  editable?: boolean;
  onChange?: (rating: number) => void;
  size?: number;
}

// 재사용 별점 컴포넌트 — 표시/편집 겸용(CS-8).
// editable이면 각 별을 탭해 1~5점을 고르고, 아니면 별만 렌더한다.
const StarRatingView: FC<Props> = ({ rating, editable = false, onChange, size }) => {
  const starSize = size ?? (editable ? 24 : 16);
  // 채움 개수 — 반올림해 정수 별 개수로 표현한다.
  const filledCount = Math.round(rating);

  const handlePress = (value: number) => {
    onChange?.(value);
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map(index => {
        const filled = index < filledCount;
        const iconName = filled ? 'star' : 'star-outline';
        const iconColor = filled ? STAR_FILLED_COLOR : Color.chipBorder;

        if (!editable) {
          return (
            <Ionicons key={index} name={iconName} size={starSize} color={iconColor} />
          );
        }

        return (
          <TouchableOpacity
            key={index}
            style={styles.starButton}
            onPress={() => handlePress(index + 1)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${index + 1}점`}
          >
            <Ionicons name={iconName} size={starSize} color={iconColor} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // HIG 44pt 터치 타깃 확보 — 별 아이콘 자체보다 큰 탭 영역을 준다.
  starButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StarRatingView;
