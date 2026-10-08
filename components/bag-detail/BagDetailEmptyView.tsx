import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import EmptyBagAddSource from '@/model/bag-detail/EmptyBagAddSource';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

// 빈 배낭 안내(BD-13). 설명만 둔다 — 누르는 것은 하단 바의 라임 하나다(화면당 주 액션 하나,
// 블록이 첫 화면 밖으로 밀려도 주 액션은 항상 보인다).
const BagDetailEmptyView: FC<Props> = ({ bagDetail }) => {
  const l10n = app.getL10n();
  const title = l10n.t('bagDetail.emptyTitle');
  const body =
    bagDetail.getEmptyAddSource() === EmptyBagAddSource.Search
      ? l10n.t('bagDetail.emptyBodySearch')
      : l10n.t('bagDetail.emptyBodyWarehouse');

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${title}. ${body}`}
    >
      <Ionicons name='bag-add-outline' size={24} color={Acg.ink} />
      <PretendardText style={styles.title} weight='semibold'>
        {title}
      </PretendardText>
      <PretendardText style={styles.body}>{body}</PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  // HM-8 면: 연회색 채움 + 모서리 12, 그림자 없음.
  container: {
    gap: 8,
    padding: 20,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  body: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
});

export default observer(BagDetailEmptyView);
