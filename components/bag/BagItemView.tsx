import React, { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import app from '@/model/app/App';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import BagCopyView from './BagCopyView';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  bagItem: BagItem;
  bag: Bag;
}
const BagItemView: FC<Props> = ({ bagItem, bag }) => {
  const date = bagItem.getDate();
  const router = useRouter();

  const handleClick = () => {
    app.getAnalyticsManager()?.logClick('bag_item');
    router.push(`/bag/${bagItem.getID()}`);
  };

  const handleClickDelete = () => {
    bag.delete(bagItem);
  };

  const handleClickUseless = () => {
    router.push(`/useless/${bagItem.getID()}`);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleClick}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.infoContainer}>
          <View style={styles.titleContainer}>
            <PretendardText weight='bold' style={styles.name}>
              {bagItem.getName()}
            </PretendardText>
            <PretendardText style={styles.date}>{date}</PretendardText>
          </View>
          <View style={styles.weightContainer}>
            <PretendardText weight='bold' style={styles.weight}>
              {bagItem.getWeight()}kg
            </PretendardText>
            {bagItem.hasPackingRecord() && (
              <View
                style={
                  bagItem.isPackingComplete()
                    ? styles.packingCompleteChip
                    : styles.packingProgressChip
                }
              >
                <PretendardText
                  style={
                    bagItem.isPackingComplete()
                      ? styles.packingCompleteChipText
                      : styles.packingProgressChipText
                  }
                  weight='medium'
                >
                  {bagItem.isPackingComplete()
                    ? '패킹 완료'
                    : `패킹 ${bagItem.getPackingPercent()}%`}
                </PretendardText>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actionContainer}>
          <BagCopyView bagItem={bagItem} />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleClickDelete}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <IconSymbol name='trash.fill' size={18} color={Color.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
      {/* <TouchableOpacity
        style={styles.uselessButton}
        onPress={handleClickUseless}
        activeOpacity={0.7}
      >
        <PretendardText style={styles.uselessButtonText}>
          사용 여부 입력하기
        </PretendardText>
      </TouchableOpacity> */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'column',
    paddingVertical: 12,
    paddingBottom: 20,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: Color.divider,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  titleContainer: {
    flexDirection: 'column',
    gap: 9,
  },
  name: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  date: {
    fontSize: 12,
    color: Color.textPrimary,
  },
  weight: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packingCompleteChip: {
    backgroundColor: Color.textPrimary,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  packingCompleteChipText: {
    fontSize: 12,
    color: Color.background,
  },
  packingProgressChip: {
    backgroundColor: Color.background,
    borderWidth: 1,
    borderColor: Color.textPrimary,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  packingProgressChipText: {
    fontSize: 12,
    color: Color.textPrimary,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    height: 32,
    width: 32,
    padding: 4,
    backgroundColor: Color.thumbBg,
    borderRadius: Radius.listThumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uselessButton: {
    backgroundColor: Color.surfaceMuted,
    paddingVertical: 10,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uselessButtonText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
});

export default BagItemView;
