import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { getHealthService } from '@/model/health/HealthService';
import { formatDistance, formatElevation } from '@/model/health/HealthFormat';

interface Props {
  bagDetail: BagDetail;
}

// 배낭 상세의 운동 기록 타일(HA-1). 액션 타일 2열 그리드의 4번째.
// 권한 요청은 여기서 하지 않는다 — 탭 이후 연결 화면에서만 띄운다(HA-2).
const BagDetailActivityView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const healthService = getHealthService();
  const activity = bagDetail.getActivity();

  // 누를 수 없는 진입점을 남기지 않는다(HA-1): 건강 허브가 없는 플랫폼·기기(웹,
  // Android 14 미만, 미지원 기기)와, 기록이 존재할 수 없는 미래 여행에서는
  // 타일 자체를 렌더하지 않는다.
  const isFutureTrip = bagDetail
    .getStartDate()
    .startOf('day')
    .isAfter(dayjs().startOf('day'));

  if (!healthService.isAvailable() || isFutureTrip) {
    return null;
  }

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('activity');

    router.push(`/bag/${bagDetail.getId()}/activity`);
  };

  // 연결된 기록이 있으면 요약을, 없으면 행동 유도를 부제로 쓴다(HA-1).
  // 상승고도는 기록원이 제공하지 않는 경우가 흔해 있을 때만 붙인다.
  const subtitle = activity
    ? [
        formatDistance(activity.distance),
        activity.elevationGain !== undefined
          ? formatElevation(activity.elevationGain)
          : null,
      ]
        .filter(part => part !== null)
        .join(' · ')
    : '기록 연결하기';

  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={
        activity ? `운동 기록 ${subtitle}` : '운동 기록 연결하기'
      }
    >
      <Ionicons name='footsteps-outline' size={24} color={Color.textPrimary} />
      <View style={styles.textWrap}>
        <PretendardText
          style={styles.title}
          weight='semibold'
          numberOfLines={1}
        >
          운동 기록
        </PretendardText>
        <PretendardText style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </PretendardText>
      </View>
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
});

export default observer(BagDetailActivityView);
