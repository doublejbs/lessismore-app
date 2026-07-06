import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import BagDetail from '@/model/bag-detail/BagDetail';
import PackingButtonState from '@/model/bag-detail/PackingButtonState';

interface Props {
  bagDetail: BagDetail;
}

const getLabel = (bagDetail: BagDetail): string => {
  const state = bagDetail.getPackingButtonState();

  switch (state) {
    case PackingButtonState.Completed:
      return '패킹 완료';
    case PackingButtonState.InProgress:
      return `패킹 ${bagDetail.getPackedCount()}/${bagDetail.getCount()}`;
    default:
      return '패킹 시작';
  }
};

const BagPackingFloatingButtonView: FC<Props> = ({ bagDetail }) => {
  const handlePress = () => {
    bagDetail.goToPacking();
  };

  if (!bagDetail.shouldShowPackingButton()) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Ionicons name='bag-check-outline' size={18} color='white' />
      <PretendardText style={styles.label} weight='bold'>
        {getLabel(bagDetail)}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    // 하단 고정 `수정하기` 바(약 72pt) 위에 뜨도록 오프셋을 준다.
    bottom: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'black',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    color: 'white',
    fontSize: 15,
  },
});

export default observer(BagPackingFloatingButtonView);
