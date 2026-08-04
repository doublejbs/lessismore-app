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
const StarRatingView: FC<Props> = ({
  rating,
  editable = false,
  onChange,
  size,
}) => {
  const starSize = size ?? (editable ? 24 : 16);
  // 채움 개수 — 반올림해 정수 별 개수로 표현한다.
  const filledCount = Math.round(rating);

  const handlePress = (value: number) => {
    onChange?.(value);
  };

  return (
    <View
      style={styles.container}
      // 읽기 전용은 별 5개가 라벨 없는 아이콘이라 VoiceOver에 평점이 아예 안 읽혔다
      // (2026-08-03 리뷰). 그룹으로 묶어 `별점 4점`처럼 한 번에 읽히게 한다.
      // 편집 모드는 각 별이 버튼이라 그룹으로 묶으면 개별 선택을 막게 되므로 그대로 둔다.
      accessible={!editable}
      {...(editable
        ? {}
        : {
            accessibilityRole: 'text' as const,
            accessibilityLabel: `별점 ${rating.toFixed(1)}점`,
          })}
    >
      {[0, 1, 2, 3, 4].map(index => {
        const filled = index < filledCount;
        const iconName = filled ? 'star' : 'star-outline';
        const iconColor = filled ? STAR_FILLED_COLOR : Color.chipBorder;

        if (!editable) {
          return (
            <Ionicons
              key={index}
              name={iconName}
              size={starSize}
              color={iconColor}
            />
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
