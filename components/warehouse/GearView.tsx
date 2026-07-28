import { FC, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import Gear from '@/model/gear/Gear';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  children?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
}

// WH-1 창고 목록 행. 장비 썸네일은 표시하지 않으며(DataModel §1 장비 이미지 미제공 원칙)
// 빈 썸네일 박스도 남기지 않는 텍스트 우선 행 레이아웃이다.
const GearView: FC<Props> = ({ gear, children, onPress }) => {
  const content = (
    <View style={styles.container}>
      <View style={styles.infoColumn}>
        <View style={styles.companyRow}>
          <PretendardText
            style={styles.companyText}
            weight="bold"
            numberOfLines={1}
          >
            {gear.getDisplayCompany()}
          </PretendardText>
          {gear.hasUsedRate() && (
            <View style={styles.usedRateBadge}>
              <PretendardText style={styles.usedRateText} weight="regular">
                사용률 {gear.getUsedRate()}%
              </PretendardText>
            </View>
          )}
        </View>

        <PretendardText
          style={styles.nameText}
          weight="bold"
          numberOfLines={2}
        >
          {gear.getDisplayName()}
        </PretendardText>

        {gear.getColor() ? (
          <PretendardText style={styles.colorText} weight="regular">
            {gear.getColor()}
          </PretendardText>
        ) : null}

        {gear.getWeight() ? (
          <PretendardText style={styles.weightText} weight="bold">
            {gear.getWeight()}g
          </PretendardText>
        ) : null}
      </View>

      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    gap: 12,
  },
  infoColumn: {
    flex: 1,
    gap: 6,
    overflow: 'hidden',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // WH-1: 브랜드는 제품 식별의 첫 축이라 이름(nameText)과 동일한 타이포로 표시한다.
  // 길면 말줄임해 사용률 배지를 같은 행에 유지한다.
  companyText: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  usedRateBadge: {
    borderRadius: Radius.card,
    backgroundColor: Color.chipInactiveBg,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  usedRateText: {
    color: Color.textPrimary,
    fontSize: 11,
  },
  nameText: {
    fontSize: 15,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  colorText: {
    fontSize: 13,
    color: Color.textTertiary,
  },
  weightText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
});

export default GearView;
