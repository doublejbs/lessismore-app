import { createElement, FC, useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { createMapLibreViewLoader } from '@/components/map/MapLibreViewLoader';
import PretendardText from '@/components/PretendardText';
import { getRouteMetaParts } from '@/components/route/RouteRowParts';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import BagPointDispatcher from '@/model/bag-point/BagPointDispatcher';
import BagPointList from '@/model/bag-point/BagPointList';
import { getPointTypeColor } from '@/model/point/PointLabels';
import { ROUTE_REPLAY_MIN_COORDINATES } from '@/model/route-replay/RouteReplayCoordinates';
import { RouteReplayPoint } from '@/model/route-replay/RouteReplayRequest';
import RouteReplaySource from '@/model/route-replay/RouteReplaySource';
import BagDetailRouteCardReplayButtonView from './BagDetailRouteCardReplayButtonView';
import type BagDetailRouteCardMapViewType from './BagDetailRouteCardMapView';

interface Props {
  bagDetail: BagDetail;
}

// 카드 위 지도 칸 높이(pt) — 그룹 상세 지도 밴드(110)보다 한 단 높게, 코스 선 모양이 읽히는 정도.
const MAP_HEIGHT = 120;
// 3D 리플레이(RR-1)는 네이티브에만 있다(APP-5).
const CAN_OPEN_REPLAY = Platform.OS !== 'web';
// 지도 칸 가장자리와 `3D로 보기` 사이 여백.
const REPLAY_PILL_INSET = 10;
// 지도 칸 없이 알약이 글자 줄 오른쪽에 설 때 글자가 비워 두는 폭(알약 폭 + 간격).
const INLINE_PILL_RESERVE = 140;

// 지도 본문은 MapLibre SDK를 최상위 import한다 — 옛 바이너리에서 import만으로 터지지 않게 쓸 때 싣는다(MAP-1).
const loadMapView = createMapLibreViewLoader<
  typeof BagDetailRouteCardMapViewType
>('BagDetailRouteCardMapView', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mapModule = require('./BagDetailRouteCardMapView') as {
    default: typeof BagDetailRouteCardMapViewType;
  };

  return mapModule.default;
});

/**
 * 여행 상세 코스 카드 (RD-9 #5 · BD-10). 코스가 1개 이상(내 코스 + 연결 그룹 코스, 중복 접기 반영)이면 액션 그리드의
 * `코스` 타일 대신 그리드 아래 전체 폭으로 선다.
 *
 * - 위: 대표 코스 선 지도(제스처를 끈 실제 지도 — `BagDetailRouteCardMapView`). 지도를 못 싣거나(옛 바이너리)
 *   데이터를 못 불러오면 칸을 걷고 글자만 남는다.
 * - 아래: 대표 코스 이름(BD-11 선택 기억 → 첫 코스) + 메타 `{거리} · 상승 {m}`(코스가 여럿이면 ` · 코스 {n}`).
 *   메타는 코스 목록 행과 같은 조각(`getRouteMetaParts` — 뒤집혔으면 `역방향`도)이라 숫자가 맨 앞이다(HM-8).
 * - 카드 본문 탭 = 코스 화면. 지도 칸 우하단 흰 보조 알약 `3D로 보기`(RR-1) = 3D 리플레이 — 지도 위에 떠 있어
 *   그림자를 둔다(HM-8 지도 위 요소). 라임이 아니다(이 화면의 라임은 하단 바 주 액션이다).
 * - 면은 연회색 채움 + 모서리 12, 그림자 없음(HM-8 · BD-10 타일과 같은 면).
 */
const BagDetailRouteCardView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const [isMapFailed, setIsMapFailed] = useState(false);
  // 3D를 여는 중(포인트 조회) — 두 번 눌러 리플레이가 두 번 쌓이지 않게.
  const openingReplayRef = useRef(false);
  const entry = bagDetail.getRepresentativeRoute();
  const bagId = bagDetail.getId();

  const handleMapLoadFailed = useCallback(() => {
    setIsMapFailed(true);
  }, []);

  if (!entry) {
    return null;
  }

  const route = entry.route;
  const count = bagDetail.getRouteCount();
  const meta = [
    ...getRouteMetaParts(route),
    ...(count > 1 ? [l10n.t('bag.route.cardCount', { count })] : []),
  ].join(l10n.t('common.metaSeparator'));
  const canReplay =
    CAN_OPEN_REPLAY &&
    route.getSimplified().length >= ROUTE_REPLAY_MIN_COORDINATES;
  const MapView = isMapFailed ? null : loadMapView();
  // 좌표 상자가 없는 코스(좌표 없음)면 지도 칸을 그리지 않는다 — 빈 지면 칸은 "깨진 지도"로 읽힌다.
  const hasMap = !!MapView && route.getBounds() !== null;

  const handleOpenRoute = () => {
    router.push(`/bag/${bagId}/route`);
  };

  /**
   * `3D로 보기`(RR-1). 리플레이 웹뷰가 타일을 서버에서 받아 온라인에서만 열린다 — 오프라인이면 토스트로 알린다.
   * 포인트는 코스 화면과 같이 이 여행의 포인트(내 포인트 + 연결 그룹 포인트)다. 상세는 포인트 수만 들고 있어
   * 누를 때 한 번 읽는다(조회가 실패하면 포인트 없이 연다 — 3D는 코스가 주인공이다).
   */
  const handleOpenReplay = async () => {
    if (openingReplayRef.current) {
      return;
    }

    if (app.getNetworkStatus().isOffline()) {
      app.getToastManager()?.showSimple(l10n.t('offline.toast.onlineToView'));

      return;
    }

    openingReplayRef.current = true;

    try {
      const pointList = BagPointList.from(BagPointDispatcher.new(), bagId);

      await pointList.initialize();

      const points: RouteReplayPoint[] = pointList
        .getVisiblePoints()
        .map(point => ({
          latitude: point.getLatitude(),
          longitude: point.getLongitude(),
          title: point.getTitle(),
          type: point.getType(),
          color: getPointTypeColor(point.getType()),
        }));

      app.getAnalyticsManager()?.logClick('route_replay_open', {
        source: RouteReplaySource.BagCard,
        point_count: points.length,
        distance_m: Math.round(route.getDistance()),
      });
      app.getRouteReplayStore().open({
        title: route.getName(),
        source: RouteReplaySource.BagCard,
        coordinates: route.getSimplified(),
        points,
      });
      router.push('/route-replay');
    } finally {
      openingReplayRef.current = false;
    }
  };

  const handlePressReplay = () => {
    void handleOpenReplay();
  };

  return (
    <View style={styles.card}>
      {hasMap ? (
        <View style={styles.map}>
          {/* 실린 컴포넌트는 모듈 캐시라 렌더마다 같은 참조다(지도 상태가 초기화되지 않는다 — 게이트와 같은 관례). */}
          {createElement(MapView, {
            route,
            onLoadFailed: handleMapLoadFailed,
          })}
        </View>
      ) : null}
      {/* 이름·메타는 덮개 버튼의 라벨이 같은 말을 한다 — VoiceOver가 두 번 읽지 않게 트리에서 뺀다. */}
      <View
        style={[
          styles.textWrap,
          canReplay && !hasMap && styles.textWrapInlinePill,
        ]}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
      >
        <PretendardText weight='medium' style={styles.title} numberOfLines={2}>
          {route.getName()}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {meta}
        </PretendardText>
      </View>
      {/* 카드 전체가 코스 화면으로 가는 버튼이다 — 지도는 보기 전용이라 터치를 받지 않는다. */}
      <Pressable
        style={({ pressed }) => [
          StyleSheet.absoluteFill,
          styles.cover,
          pressed && styles.pressed,
        ]}
        onPress={handleOpenRoute}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('bag.route.cardLabel', {
          name: route.getName(),
          meta,
        })}
      />
      {/* 지도 칸 우하단 — 칸과 같은 크기의 겹친 층에 아래·오른쪽으로 붙여 Dynamic Type으로 커지면 위로 자란다. */}
      {canReplay && hasMap ? (
        <View style={styles.mapOverlay} pointerEvents='box-none'>
          <View style={styles.replayOnMap}>
            <BagDetailRouteCardReplayButtonView
              onMap
              onPress={handlePressReplay}
            />
          </View>
        </View>
      ) : null}
      {/* 지도 칸이 없으면(옛 바이너리·좌표 없음·지도 로드 실패) 글자 줄 오른쪽 아래에 둔다. */}
      {canReplay && !hasMap ? (
        <View style={styles.replayInline}>
          <BagDetailRouteCardReplayButtonView
            onMap={false}
            onPress={handlePressReplay}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // BD-10 타일과 같은 면 — 연회색 채움 + 모서리 12, 그림자 없음(HM-8).
  card: {
    width: '100%',
    borderRadius: AcgRadius.thumb,
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
  },
  map: {
    height: MAP_HEIGHT,
    // 타일이 뜨기 전 자리 — 카드 면과 같은 연회색.
    backgroundColor: Acg.controlFill,
  },
  // 지도 칸과 같은 자리·크기의 겹친 층(덮개 버튼 위) — 알약만 터치를 받는다.
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: MAP_HEIGHT,
  },
  replayOnMap: {
    position: 'absolute',
    right: REPLAY_PILL_INSET,
    bottom: REPLAY_PILL_INSET,
  },
  replayInline: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },
  textWrap: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 2,
  },
  // 알약이 글자 줄 오른쪽에 설 때 — 이름·메타가 알약 밑으로 들어가지 않게 비운다.
  textWrapInlinePill: {
    paddingRight: INLINE_PILL_RESERVE,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  // 메타는 잉크다(HM-8 — 무게·거리는 정보다).
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  cover: {
    borderRadius: AcgRadius.thumb,
  },
  pressed: {
    backgroundColor: Acg.inkTint,
  },
});

export default observer(BagDetailRouteCardView);
