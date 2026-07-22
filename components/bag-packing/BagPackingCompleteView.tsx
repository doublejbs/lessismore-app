import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import BagPacking from '@/model/bag-packing/BagPacking';

interface Props {
  bagPacking: BagPacking;
}

const BagPackingCompleteView: FC<Props> = ({ bagPacking }) => {
  const totalWeight = bagPacking.getTotalWeight();
  const showDDay = bagPacking.hasUpcomingDeparture();
  const dDay = bagPacking.getDDay();

  const handlePressClose = () => {
    bagPacking.dismissCompleteCard();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <PretendardText style={styles.title} weight='extraBold'>
          패킹 완료
        </PretendardText>
        <PretendardText style={styles.weightText} weight='bold'>
          {totalWeight}kg
        </PretendardText>
        {showDDay && (
          <PretendardText style={styles.dDayText} weight='medium'>
            출발까지 {dDay}일 남았어요
          </PretendardText>
        )}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePressClose}
            activeOpacity={0.7}
          >
            <PretendardText style={styles.primaryButtonText} weight='bold'>
              닫기
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    color: '#191F28',
  },
  weightText: {
    fontSize: 32,
    color: '#191F28',
  },
  dDayText: {
    fontSize: 15,
    color: '#8B95A1',
  },
  actions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: 'black',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default observer(BagPackingCompleteView);
