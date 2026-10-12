import { ComponentProps, createElement, FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { AcgLayout, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { isOfflineMapAvailable } from '@/model/offline/OfflineMapModule';
import type OfflineRouteMapViewType from './OfflineRouteMapView';
import OfflineSnapshotBandView from './OfflineSnapshotBandView';

type OfflineRouteMapViewComponent = typeof OfflineRouteMapViewType;
type Props = ComponentProps<OfflineRouteMapViewComponent>;

let offlineRouteMapView: OfflineRouteMapViewComponent | null | undefined;

// MapLibre 지도 뷰가 있는 바이너리에서만 `OfflineRouteMapView`를 싣는다. 그 파일(과 `OfflineMap*View`)은
// SDK를 최상위에서 import하고, SDK는 import 시점에 네이티브 모듈을 `getEnforcing`으로 찾아 던진다.
const loadOfflineRouteMapView = (): OfflineRouteMapViewComponent | null => {
  if (offlineRouteMapView !== undefined) {
    return offlineRouteMapView;
  }

  if (!isOfflineMapAvailable()) {
    offlineRouteMapView = null;

    return offlineRouteMapView;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('./OfflineRouteMapView') as {
      default: OfflineRouteMapViewComponent;
    };

    offlineRouteMapView = loaded.default;
  } catch (error) {
    console.warn('[OfflineRouteMapGateView] 오프라인 지도 싣기 실패', error); // l10n-ignore: 개발자 로그
    offlineRouteMapView = null;
  }

  return offlineRouteMapView;
};

/**
 * 오프라인 코스 지도의 바이너리 가드 (OF-6 · §5). MapLibre 네이티브 모듈이 있으면(2.0.3 이상 바이너리)
 * `OfflineRouteMapView`를 그리고, 없으면(옛 바이너리 — OTA로 잘못 나간 경우의 안전망) 지도 자리에
 * `이 버전에서는 오프라인 지도를 볼 수 없어요 · 앱을 업데이트해 주세요` 한 줄만 둔다 — 코스 목록은 화면이
 * 그대로 그린다(`OfflineUnavailableView`로 화면 전체를 막지 않는다).
 */
const OfflineRouteMapGateView: FC<Props> = props => {
  // 실린 컴포넌트는 모듈 캐시라 렌더마다 같은 참조다(새로 만들지 않는다 — 상태가 초기화되지 않는다).
  const offlineRouteMapViewComponent = loadOfflineRouteMapView();

  if (offlineRouteMapViewComponent) {
    return createElement(offlineRouteMapViewComponent, props);
  }

  return (
    <View style={[styles.notice, { paddingTop: props.topInset }]}>
      <OfflineSnapshotBandView
        label={app.getL10n().t('offline.map.unsupportedBinary')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: Spacing.item,
  },
});

export default OfflineRouteMapGateView;
