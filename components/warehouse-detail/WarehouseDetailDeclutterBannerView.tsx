import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import { formatGearWeight } from '@/model/gear/WeightFormat';
import PretendardText from '../PretendardText';
import {
  LiquidLayout,
  LiquidRadius,
  LiquidSemantic,
} from '@/constants/DesignTokens';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 덜어내기 시그널(GD-12) — 최근 기록 3회 연속 '사용 안함'일 때만 조용히 알려주는 정보성 배너.
// 탭 액션 없음, 삭제 유도 아님. 경고 빨강(`danger`)이 아니라 차분한 경고 면을 쓴다.
const WarehouseDetailDeclutterBannerView: FC<Props> = ({ warehouseDetail }) => {
  const signal = warehouseDetail.getDeclutterSignal();

  if (!signal) {
    return null;
  }

  // 장비 개별 무게라 g 고정이고 천 단위 구분자를 넣지 않는다(DM-26) —
  // 목록 행의 `7200g`과 같은 값이 여기서 `7,200g`으로 보이면 다른 값처럼 읽힌다.
  const message =
    signal.weightG !== null
      ? `최근 3번의 여행에서 쓰지 않았어요 — 배낭에서 빼면 −${formatGearWeight(
          signal.weightG
        )}`
      : '최근 3번의 여행에서 쓰지 않았어요';

  return (
    <View style={styles.container}>
      <View style={styles.banner} accessibilityLabel={message}>
        <Ionicons
          name='bag-remove-outline'
          size={18}
          color={LiquidSemantic.warnInk}
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
    paddingHorizontal: LiquidLayout.screenH,
    // 위 섹션이 하단 여백을 이미 비워 두므로 아래쪽만 띄운다.
    marginBottom: LiquidLayout.section,
  },
  // 의미색(warn)은 액센트 체계 밖이라 리디자인해도 값이 바뀌지 않는다 — 면·모서리만 옮긴다.
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: LiquidLayout.cardPad,
    backgroundColor: LiquidSemantic.warnBg,
    borderRadius: LiquidRadius.tile,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: LiquidSemantic.warnInk,
  },
});

export default observer(WarehouseDetailDeclutterBannerView);
