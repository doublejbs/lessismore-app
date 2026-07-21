import { FC, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import GearImageView from '@/components/warehouse/GearImageView';
import PretendardText from '@/components/PretendardText';
import Gear from '@/model/gear/Gear';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  children?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
}

const GearView: FC<Props> = ({ gear, children, onPress }) => {
  const imageUrl = gear.getImageUrl();

  const content = (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <GearImageView imageUrl={imageUrl} />
      </View>

      <View style={styles.infoColumn}>
        <View style={styles.companyRow}>
          <PretendardText style={styles.companyText} weight="regular">
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
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    backgroundColor: Color.thumbBg,
    alignItems: 'center',
    minWidth: 80,
    borderRadius: Radius.listThumb,
    justifyContent: 'center',
    overflow: 'hidden',
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
  companyText: {
    fontSize: 12,
    color: Color.textTertiary,
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
