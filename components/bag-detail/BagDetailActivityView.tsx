import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import BagDetailTileView from './BagDetailTileView';
import { getHealthService } from '@/model/health/HealthService';
import { formatDistance, formatElevation } from '@/model/health/HealthFormat';

interface Props {
  bagDetail: BagDetail;
  columns?: 2 | 3;
}

/**
 * 이 배낭에 운동 기록 타일을 그릴지(HA-1).
 *
 * 누를 수 없는 진입점을 남기지 않는다: 건강 허브가 없는 플랫폼·기기(웹, Android 14 미만,
 * 미지원 기기)와, 기록이 존재할 수 없는 미래 여행에서는 타일 자체를 렌더하지 않는다.
 *
 * 판정을 내보내는 이유는 **그리드 열 수가 타일 개수로 갈리기 때문**이다(BD-10) — 부모가
 * 같은 조건을 따로 세우면 한 줄 3열로 눌러야 할 화면이 빈 칸을 남긴 2열로 남는다.
 */
export const shouldShowActivityTile = (bagDetail: BagDetail): boolean => {
  const isFutureTrip = bagDetail
    .getStartDate()
    .startOf('day')
    .isAfter(dayjs().startOf('day'));

  return getHealthService().isAvailable() && !isFutureTrip;
};

// 배낭 상세의 운동 기록 타일(HA-1). 액션 타일 그리드의 4번째.
// 권한 요청은 여기서 하지 않는다 — 탭 이후 연결 화면에서만 띄운다(HA-2).
const BagDetailActivityView: FC<Props> = ({ bagDetail, columns = 2 }) => {
  const router = useRouter();
  const activity = bagDetail.getActivity();

  if (!shouldShowActivityTile(bagDetail)) {
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
    <BagDetailTileView
      icon='footsteps-outline'
      columns={columns}
      title='운동 기록'
      subtitle={subtitle}
      onPress={handlePress}
      accessibilityLabel={
        activity ? `운동 기록 ${subtitle}` : '운동 기록 연결하기'
      }
    />
  );
};

export default observer(BagDetailActivityView);
