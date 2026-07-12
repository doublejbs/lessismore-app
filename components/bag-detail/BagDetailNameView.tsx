import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

// 배낭 이름 라지 타이틀(BD-1). 탭하면 배낭 정보 수정 formSheet(/bag-info-edit)를 연다.
const BagDetailNameView: FC<Props> = ({ bagDetail }) => {
  const handleNamePress = () => {
    bagDetail.openInfoEdit();
  };

  return (
    <TouchableOpacity
      style={styles.nameContainer}
      onPress={handleNamePress}
      accessibilityRole='button'
      accessibilityLabel='배낭 정보 수정'
    >
      <PretendardText style={styles.nameText} weight='bold'>
        {bagDetail.getName()}
      </PretendardText>
      <Ionicons name='pencil' size={15} color={Color.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  nameContainer: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 4,
    borderRadius: Radius.listThumb,
    gap: 6,
  },
  nameText: {
    fontSize: 28,
    color: Color.textPrimary,
  },
});

export default observer(BagDetailNameView);
