import React, { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import app from '@/model/app/App';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import BagCopyView from './BagCopyView';

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
            <PretendardText style={styles.name}>
              {bagItem.getName()}
            </PretendardText>
            <PretendardText style={styles.date}>{date}</PretendardText>
          </View>
          <PretendardText style={styles.weight}>
            {bagItem.getWeight()}kg
          </PretendardText>
        </View>
        <View style={styles.actionContainer}>
          <BagCopyView bagItem={bagItem} />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleClickDelete}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <IconSymbol name='trash.fill' size={18} color='#666' />
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
    borderBottomColor: '#F2F4F6',
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
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
    color: '#000000',
  },
  date: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 12,
    color: '#000000',
  },
  weight: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
    color: '#000000',
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
    backgroundColor: '#F1F1F1',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uselessButton: {
    backgroundColor: '#F5F7FB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uselessButtonText: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 14,
    color: '#000000',
  },
});

export default BagItemView;
