import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';

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
      <PretendardText
        style={styles.nameText}
        weight='semibold'
        numberOfLines={2}
      >
        {bagDetail.getName()}
      </PretendardText>
      <Ionicons name='pencil' size={15} color={Acg.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  nameContainer: {
    alignSelf: 'flex-start',
    // alignSelf: flex-start면 컨테이너가 콘텐츠 크기로 잡혀 부모 폭을 넘어서고,
    // 그 안에서는 자식이 넘치지 않으니 nameText의 flexShrink가 발동하지 않는다.
    // 폭을 부모로 제한해야 텍스트가 줄어들고 연필이 화면 안에 남는다.
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 4,
    gap: 6,
  },
  // 화면 제목 — 앱 공통 값. 2줄까지 늘어나도 같은 단(22/28)을 쓴다.
  nameText: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default observer(BagDetailNameView);
