import React, { FC, ReactNode } from 'react';
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
      <View style={styles.imageSection}>
        <View style={styles.imageContainer}>
          <GearImageView imageUrl={imageUrl} />
        </View>
      </View>

      <View style={styles.contentSection}>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.infoColumn}>
              <View style={styles.infoContainer}>
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
              </View>

              {gear.getWeight() ? (
                <PretendardText style={styles.weightText} weight="bold">
                  {gear.getWeight()}g
                </PretendardText>
              ) : null}
            </View>
          </View>
        </View>
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
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 12,
  },
  imageSection: {
    flexDirection: 'row',
    gap: 6,
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
  contentSection: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  infoColumn: {
    flex: 1,
    gap: 7,
  },
  infoContainer: {
    overflow: 'hidden',
    gap: 7,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyText: {
    fontSize: 10,
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
    fontSize: 10,
  },
  nameText: {
    fontSize: 14,
    lineHeight: 16,
    color: Color.textPrimary,
  },
  colorText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  weightText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
});

export default GearView;
