import React, { FC, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import GearImageView from '@/components/warehouse/GearImageView';
import Gear from '@/model/gear/Gear';

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
                  <Text style={styles.companyText}>{gear.getCompany()}</Text>
                  {gear.hasUsedRate() && (
                    <View style={styles.usedRateBadge}>
                      <Text style={styles.usedRateText}>
                        사용률 {gear.getUsedRate()}%
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.nameText} numberOfLines={2}>
                  {gear.getDisplayName()}
                </Text>

                <Text style={styles.colorText}>{gear.getColor()}</Text>
              </View>

              <Text style={styles.weightText}>
                {gear.getWeight() ? `${gear.getWeight()}g` : ''}
              </Text>
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
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    minWidth: 80,
    borderRadius: 4,
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
    fontFamily: 'Pretendard-Regular',
    fontSize: 10,
    color: '#000000',
  },
  usedRateBadge: {
    borderRadius: 10,
    backgroundColor: 'rgb(235, 235, 235)',
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  usedRateText: {
    fontFamily: 'Pretendard-Regular',
    color: 'black',
    fontSize: 10,
  },
  nameText: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 14,
    lineHeight: 16,
    color: '#000000',
  },
  colorText: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 14,
    color: '#000000',
  },
  weightText: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 14,
    color: '#000000',
  },
});

export default GearView;
