import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

// 여행 기간 + 상황 라벨 행(BD-1). 탭하면 배낭 정보 수정 formSheet(/bag-info-edit)를 연다.
const BagDetailDateView: FC<Props> = ({ bagDetail }) => {
  const handleDatePress = () => {
    bagDetail.openInfoEdit();
  };

  return (
    <TouchableOpacity
      style={styles.dateContainer}
      onPress={handleDatePress}
      accessibilityRole='button'
      accessibilityLabel='여행 날짜 수정'
    >
      <PretendardText style={styles.dateText} numberOfLines={2}>
        {bagDetail.getDate()} · {bagDetail.getPhaseLabel()}
      </PretendardText>
      <Ionicons name='pencil' size={12} color={Acg.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dateContainer: {
    alignSelf: 'flex-start',
    // 이름 행과 같은 이유로 폭을 부모로 제한한다(BagDetailNameView 주석 참고).
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 4,
    gap: 6,
    marginBottom: 4,
  },
  dateText: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 19,
    color: Acg.textMuted,
    flexShrink: 1,
  },
});

export default observer(BagDetailDateView);
