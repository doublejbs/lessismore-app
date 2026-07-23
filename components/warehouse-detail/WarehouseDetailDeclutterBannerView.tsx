import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 덜어내기 시그널(GD-12) — 최근 기록 3회 연속 '안 씀'일 때만 조용히 알려주는 정보성 배너.
// 탭 액션 없음, 삭제 유도 아님. 경고 빨강 대신 차분한 톤(surfaceMuted)을 쓴다.
const WarehouseDetailDeclutterBannerView: FC<Props> = ({ warehouseDetail }) => {
  const signal = warehouseDetail.getDeclutterSignal();

  if (!signal) {
    return null;
  }

  const message =
    signal.weightG !== null
      ? `최근 3번의 여행에서 쓰지 않았어요 — 배낭에서 빼면 −${signal.weightG.toLocaleString()}g`
      : '최근 3번의 여행에서 쓰지 않았어요';

  return (
    <View style={styles.container}>
      <View style={styles.banner} accessibilityLabel={message}>
        <Ionicons
          name='bag-remove-outline'
          size={18}
          color={Color.textPrimary}
        />
        <PretendardText weight='medium' style={styles.messageText}>
          {message}
        </PretendardText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: Color.textPrimary,
  },
});

export default observer(WarehouseDetailDeclutterBannerView);
