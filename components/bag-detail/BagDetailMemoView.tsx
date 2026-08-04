import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { AcgShadow, Acg, Color, Radius } from '@/constants/DesignTokens';

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
    // 지면 위 타일이라 종이 면을 쓴다 — 회색(surfaceMuted)은 지면과 가까워 타일이
    // 떠 보이지 않았다(2026-08-04 사용자 지적). 강조 타일만 잉크 면이다.
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
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
    fontSize: 15,
    lineHeight: 21,
    color: Color.textPrimary,
  },
});

export default observer(BagDetailMemoView);
