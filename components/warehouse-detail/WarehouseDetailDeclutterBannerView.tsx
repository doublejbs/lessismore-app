import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 덜어내기 시그널(GD-12) — 최근 기록 3회 연속 '사용 안함'일 때만 조용히 알려주는 정보성 배너.
// 탭 액션 없음, 삭제 유도 아님. 경고 빨강 대신 차분한 톤(surfaceMuted)을 쓴다.
const WarehouseDetailDeclutterBannerView: FC<Props> = ({ warehouseDetail }) => {
  const signal = warehouseDetail.getDeclutterSignal();

  if (!signal) {
    return null;
  }

  const message =
    signal.weightG !== null
      ? app.getL10n().t('gearDetail.declutterWithWeight', {
          weight: signal.weightG.toLocaleString(app.getL10n().language),
        })
      : app.getL10n().t('gearDetail.declutterWithoutWeight');

  return (
    <View style={styles.container}>
      <View style={styles.banner} accessibilityLabel={message}>
        <Ionicons name='bag-remove-outline' size={18} color={Acg.warnText} />
        <PretendardText weight='medium' style={styles.messageText}>
          {message}
        </PretendardText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenH,
    marginBottom: 12,
  },
  // 정보성 경고 톤(ACG) — 앱의 회색 면 대신 핸드오프의 경고 면을 쓴다. 삭제 유도가 아니라
  // 알림이라 빨강은 여전히 쓰지 않는다.
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Acg.warnBg,
  },
  messageText: {
    flex: 1,
    ...AcgType.meta,
    color: Acg.warnText,
  },
});

export default observer(WarehouseDetailDeclutterBannerView);
