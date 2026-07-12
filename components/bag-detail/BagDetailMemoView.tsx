import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
        <PretendardText style={styles.memoContent} numberOfLines={3}>
          {memo}
        </PretendardText>
      ) : (
        <View style={styles.textWrap}>
          <PretendardText style={styles.title} weight='medium'>
            메모
          </PretendardText>
          <PretendardText style={styles.subtitle} numberOfLines={1}>
            작성하기
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
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    padding: 14,
    justifyContent: 'space-between',
  },
  textWrap: {
    gap: 2,
  },
  title: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  memoContent: {
    fontSize: 13,
    lineHeight: 18,
    color: Color.textPrimary,
  },
});

export default observer(BagDetailMemoView);
