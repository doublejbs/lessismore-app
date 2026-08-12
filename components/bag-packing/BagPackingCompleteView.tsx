import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import BagPacking from '@/model/bag-packing/BagPacking';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';

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
        <AcgDisplayText
          style={styles.weightText}
        >{`${totalWeight}kg`}</AcgDisplayText>
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
  // 딤 위 흰 카드 — 여기서는 지면이 어두운 딤이라 흰 면이 맞다. 모서리는 모달 값(16)이다.
  card: {
    width: '100%',
    backgroundColor: Acg.paper,
    borderRadius: Radius.modal,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  weightText: {
    ...AcgType.displayLarge,
    color: Acg.ink,
  },
  dDayText: {
    ...AcgType.sectionSubtitle,
    color: Acg.textMuted,
  },
  actions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: Acg.ink,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Acg.paper,
    ...AcgType.control,
  },
});

export default observer(BagPackingCompleteView);
