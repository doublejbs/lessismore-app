import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType, Color } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailMemoView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const hasMemo = bagDetail.hasMemo();
  const memo = bagDetail.getMemo();

  const handlePressMemo = () => {
    app.getAnalyticsManager()?.logClick('bag_memo');
    router.push(`/bag/${bagDetail.getId()}/memo`);
  };

  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={handlePressMemo}
      activeOpacity={0.7}
    >
      <Ionicons
        name='document-text-outline'
        size={22}
        color={Color.textPrimary}
      />
      {hasMemo ? (
        // 메모가 있으면 '메모' 라벨을 빼고 내용에 공간을 다 준다(아이콘으로 메모임을 식별).
        // 옆 타일의 주 텍스트(라벨 15pt medium)와 위계를 맞춘다.
        <PretendardText
          style={styles.memoContent}
          weight='medium'
          numberOfLines={3}
        >
          {memo}
        </PretendardText>
      ) : (
        <View style={styles.textWrap}>
          <PretendardText style={styles.title} weight='medium'>
            {app.getL10n().t('bag.memo.title')}
          </PretendardText>
          <PretendardText style={styles.subtitle} numberOfLines={1}>
            {app.getL10n().t('bag.memo.write')}
          </PretendardText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    minHeight: 92,
    /**
     * 순백 지면 위 연회색 면(2026-08-11) — 지면이 흰색이 되면서 흰 종이 면은 보이지 않고
     * 그림자만 남았다. 그림자를 걷고 채움으로 면을 만든다(탐색 셀과 같은 규칙).
     * 강조 타일만 잉크 면이다 — 라임은 하단 주 액션 하나뿐이다.
     */
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 14,
    justifyContent: 'space-between',
  },
  textWrap: {
    gap: 2,
  },
  title: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  subtitle: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  memoContent: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
});

export default observer(BagDetailMemoView);
