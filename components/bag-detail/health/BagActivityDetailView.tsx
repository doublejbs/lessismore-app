import { FC, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgType,
  Color,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import BagActivity from '@/model/bag/BagActivity';
import BagActivityDetailStatus from '@/model/bag/BagActivityDetailStatus';
import {
  buildActivityReplayCoordinates,
  measureRouteCoordinates,
  ROUTE_REPLAY_MIN_COORDINATES,
} from '@/model/route-replay/RouteReplayCoordinates';
import RouteReplaySource from '@/model/route-replay/RouteReplaySource';
import { createMapLibreViewLoader } from '@/components/map/MapLibreViewLoader';
import type BagActivityRouteMapViewType from './BagActivityRouteMapView';
import BagActivitySummaryView from './BagActivitySummaryView';
import BagActivityWorkoutDetailView from './BagActivityWorkoutDetailView';

interface Props {
  bagActivity: BagActivity;
}

// 3D 리플레이 진입(RR-1)은 네이티브에만 있다(APP-5).
const CAN_OPEN_REPLAY = Platform.OS !== 'web';

// 경로 지도는 MapLibre SDK를 최상위 import한다 — 옛 바이너리에서 import만으로 터지지 않게 쓸 때 싣는다(MAP-1).
// 옛 바이너리(MapLibre 없음)와 웹(지도 없음)에서는 `null`이라 지도 자리를 비운다.
const loadRouteMapView = createMapLibreViewLoader<
  typeof BagActivityRouteMapViewType
>(
  'BagActivityRouteMapView',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./BagActivityRouteMapView') as {
      default: typeof BagActivityRouteMapViewType;
    }).default
);
// `3D 리플레이` 보조 알약의 아이콘-라벨 간격·좌우 패딩(세로 패딩은 `Spacing.item`).
const REPLAY_PILL_ICON_GAP = 6;
const REPLAY_PILL_PADDING_H = 16;

// 연결된 운동 기록의 상세(HA-4). 요약 → 경로 지도 → 운동별 추이 순으로 쌓는다.
//
// 요약은 Firestore 스냅샷(DM-22)이라 항상 그릴 수 있고, 지도·그래프는 기기에서
// 다시 읽은 값이라 없을 수 있다(HA-5). 없다고 화면을 막지 않는다.
const BagActivityDetailView: FC<Props> = ({ bagActivity }) => {
  const summary = bagActivity.getLinkedSummary();
  const status = bagActivity.getDetailStatus();
  const details = bagActivity.getDetails();
  const routes = bagActivity.getRoutes();
  const BagActivityRouteMapView = loadRouteMapView();
  const saving = bagActivity.isSaving();
  const router = useRouter();
  // 모든 운동의 경로를 시간순으로 이은 한 줄(RR-1). 수천 점을 정렬하므로 운동 상세가 바뀔 때만 다시
  // 만든다 — `getRoutes()`는 부를 때마다 새 배열이라 `details`(통째로 갈아 끼우는 값)에서 직접 꺼낸다.
  const replayCoordinates = useMemo(
    () =>
      buildActivityReplayCoordinates(
        details.flatMap(detail => (detail.route ? [detail.route] : []))
      ),
    [details]
  );
  const canOpenReplay =
    CAN_OPEN_REPLAY && replayCoordinates.length >= ROUTE_REPLAY_MIN_COORDINATES;

  // 3D 리플레이 열기(RR-1). 오프라인이면 열지 않고 알린다 — 웹뷰가 타일을 서버에서 받는다.
  const handleOpenReplay = () => {
    if (app.getNetworkStatus().isOffline()) {
      app
        .getToastManager()
        ?.showSimple(app.getL10n().t('offline.toast.onlineToView'));

      return;
    }

    app.getAnalyticsManager()?.logClick('route_replay_open', {
      source: RouteReplaySource.Activity,
      point_count: 0,
      distance_m: Math.round(measureRouteCoordinates(replayCoordinates)),
    });
    app.getRouteReplayStore().open({
      title: app.getL10n().t('routeReplay.activityTitle'),
      source: RouteReplaySource.Activity,
      coordinates: replayCoordinates,
      points: [],
    });
    router.push('/route-replay');
  };

  const handleRetry = () => {
    void bagActivity.retryDetail();
  };

  const handleUnlink = () => {
    void bagActivity.unlink();
  };

  if (!summary) {
    return null;
  }

  const renderDetailSection = () => {
    if (status === BagActivityDetailStatus.Loading) {
      return (
        <View style={styles.detailPlaceholder}>
          <ActivityIndicator color={Color.textSecondary} />
        </View>
      );
    }

    if (status === BagActivityDetailStatus.Unavailable) {
      return (
        <View style={styles.detailPlaceholder}>
          <PretendardText style={styles.noticeText}>
            {app.getL10n().t('health.detailUnavailable')}
          </PretendardText>
          <TouchableOpacity
            style={styles.textButton}
            onPress={handleRetry}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('health.detailRetry')}
          >
            <PretendardText style={styles.textButtonLabel} weight='semibold'>
              {app.getL10n().t('common.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* 경로가 없으면 지도만 빼고 넘어간다. 예전에는 이유를 문장으로 알렸는데,
            서드파티 동기화 기록에는 경로가 거의 없어 대부분의 사용자에게 늘 뜨는
            안내가 됐다 — 고칠 수 없는 사실을 매번 알리는 셈이었다(2026-08-05 사용자 결정). */}
        {routes.length > 0 && BagActivityRouteMapView ? (
          <BagActivityRouteMapView routes={routes} />
        ) : null}
        {/* 지도 밴드 바로 아래 보조 알약(RR-1) — 지도 위가 아니라 그림자 없는 연회색 면이다. */}
        {canOpenReplay ? (
          <TouchableOpacity
            style={styles.replayButton}
            onPress={handleOpenReplay}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('routeReplay.openFromActivity')}
          >
            <Ionicons name='cube-outline' size={18} color={Acg.ink} />
            <PretendardText weight='semibold' style={styles.replayLabel}>
              {app.getL10n().t('routeReplay.openFromActivity')}
            </PretendardText>
          </TouchableOpacity>
        ) : null}
        {details.map(detail => (
          <BagActivityWorkoutDetailView
            key={detail.workout.id}
            detail={detail}
            isOnly={details.length === 1}
          />
        ))}
      </>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <BagActivitySummaryView
        summary={summary}
        weightGrams={bagActivity.getWeightGrams()}
        {...(details.length === 1
          ? { singleWorkout: details[0].workout }
          : {})}
      />
      {renderDetailSection()}
      {/* 파괴적 액션이라 화면 맨 아래에 텍스트 버튼으로 둔다 — 주 액션과 경쟁하지 않게. */}
      <TouchableOpacity
        style={styles.textButton}
        onPress={handleUnlink}
        disabled={saving}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityState={{ disabled: saving }}
        accessibilityLabel={app.getL10n().t('health.unlinkAction')}
      >
        <PretendardText style={styles.unlinkLabel} weight='semibold'>
          {app.getL10n().t('health.unlink')}
        </PretendardText>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.section,
    paddingHorizontal: Spacing.screenH,
    paddingBottom: Spacing.section,
  },
  detailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.item,
    paddingVertical: Spacing.section,
  },
  noticeText: {
    ...AcgType.body,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  replayButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: REPLAY_PILL_ICON_GAP,
    paddingHorizontal: REPLAY_PILL_PADDING_H,
    paddingVertical: Spacing.item,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  replayLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  // 화면의 다른 요소가 전부 좌측 정렬인데 이 버튼만 가운데라 축이 어긋났다
  // (2026-08-05 디자인 리뷰). 좌측으로 붙이고 좌우 패딩은 뺀다.
  textButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  textButtonLabel: {
    ...AcgType.control,
    color: Color.textPrimary,
    textDecorationLine: 'underline',
  },
  // 연결 해제는 되돌리기 쉬운(다시 연결하면 되는) 동작이라 경고색 대신 보조 톤을 쓴다.
  unlinkLabel: {
    ...AcgType.control,
    color: Color.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default observer(BagActivityDetailView);
