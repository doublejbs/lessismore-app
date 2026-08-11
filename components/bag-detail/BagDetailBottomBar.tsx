import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PackingButtonState from '@/model/bag-detail/PackingButtonState';
import TripPhase from '@/model/bag/TripPhase';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

/**
 * 패킹 진행 라벨(PK-1). 진행 중에는 `패킹 {n}/{m}` — 홈 히어로·배낭 목록 카드와 **같은 말**을
 * 쓴다(핸드오프 카피: 패킹 진행은 어디서나 `패킹 {n}/{m}`).
 */
const getPackingLabel = (bagDetail: BagDetail): string => {
  switch (bagDetail.getPackingButtonState()) {
    case PackingButtonState.Completed:
      return '패킹 완료';
    case PackingButtonState.InProgress:
      return `패킹 ${bagDetail.getPackedCount()}/${bagDetail.getCount()}`;
    default:
      return '패킹 시작';
  }
};

/**
 * BD-9 하단 고정 액션 바.
 *
 * **주 액션은 여행 단계가 정한다**(2026-08-11 개정). 지난 여행에서 권할 일은 짐 싸기가
 * 아니라 `사용 기록`이다 — 이미 끝난 여행에 `패킹 시작`을 주 액션으로 세우면 할 수 없는
 * 일을 시킨다. 같은 이유로 지난 여행에서는 패킹 진입점을 바에서 내리고(화면당 주 액션 하나,
 * 알약 셋은 좁은 폭에서 말줄임된다) 보조 자리를 `장비 추가`가 잇는다.
 */
const BagDetailBottomBar: FC<Props> = ({ bagDetail }) => {
  const isAfterTrip = bagDetail.getTripPhase() === TripPhase.After;
  const showPacking = !isAfterTrip && bagDetail.shouldShowPackingButton();

  const handleEdit = () => {
    app.getAnalyticsManager()?.logClick('bag_edit');
    bagDetail.goToEdit();
  };

  const handlePacking = () => {
    bagDetail.goToPacking();
  };

  const handleUseless = () => {
    app.getAnalyticsManager()?.logClick('bag_useless');
    bagDetail.goToUseless();
  };

  return (
    <View style={styles.container}>
      {showPacking && (
        <LiquidPillButton
          label={getPackingLabel(bagDetail)}
          variant='glass'
          onPress={handlePacking}
          leading={
            <Ionicons name='bag-check-outline' size={18} color={Liquid.ink} />
          }
        />
      )}
      {isAfterTrip && (
        <LiquidPillButton
          label='장비 추가'
          variant='glass'
          onPress={handleEdit}
        />
      )}
      {/* 화면당 주 액션은 하나 — 이 CTA가 남은 폭을 다 가져간다. */}
      <LiquidPillButton
        label={isAfterTrip ? '사용 기록' : '장비 추가'}
        onPress={isAfterTrip ? handleUseless : handleEdit}
        style={styles.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 지면 위에 놓인 바라 면을 깔지 않는다 — 흰 띠가 버튼 주위를 감싸면 지형이 끊긴다
  // (2026-08-04 사용자 지적). 버튼 자체가 유리·잉크 면이라 이미 충분히 읽힌다.
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    // 목업의 `12px 20px calc(34px + 10px)` — 34는 세이프에어리어(SafeAreaView가 처리)이고
    // 여기서는 그 위에 얹는 10만 준다. 0이면 알약이 화면 밑변에 붙는다.
    paddingBottom: 10,
    paddingHorizontal: LiquidLayout.screenH,
    backgroundColor: 'transparent',
  },
  primary: {
    flex: 1,
  },
});

export default observer(BagDetailBottomBar);
