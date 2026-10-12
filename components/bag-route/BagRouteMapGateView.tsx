import { ComponentProps, createElement, FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { createMapLibreViewLoader } from '@/components/map/MapLibreViewLoader';
import MapNoticeLineView from '@/components/map/MapNoticeLineView';
import { AcgLayout, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import type BagRouteMapViewType from './BagRouteMapView';

type BagRouteMapViewComponent = typeof BagRouteMapViewType;
type Props = ComponentProps<BagRouteMapViewComponent>;

// 지도 본문은 MapLibre SDK를 최상위 import한다 — 옛 바이너리에서 import만으로 터지지 않게 쓸 때 싣는다(MAP-1).
const loadBagRouteMapView = createMapLibreViewLoader<BagRouteMapViewComponent>(
  'BagRouteMapView',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./BagRouteMapView') as { default: BagRouteMapViewComponent })
      .default
);

/**
 * 배낭 코스 지도의 바이너리 가드 (MAP-1 · OF §5). MapLibre 네이티브 모듈이 있으면 `BagRouteMapView`를 그리고,
 * 없으면(옛 바이너리 — OTA가 잘못 나간 경우의 안전망) 지도 자리에 `map.unsupportedBinary` 한 줄만 둔다.
 * 코스 목록은 화면이 그대로 그린다(화면 전체를 막지 않는다).
 */
const BagRouteMapGateView: FC<Props> = props => {
  // 실린 컴포넌트는 모듈 캐시라 렌더마다 같은 참조다(새로 만들지 않는다 — 상태가 초기화되지 않는다).
  const bagRouteMapView = loadBagRouteMapView();

  if (bagRouteMapView) {
    return createElement(bagRouteMapView, props);
  }

  return (
    <View style={[styles.notice, { paddingTop: props.topInset }]}>
      <MapNoticeLineView label={app.getL10n().t('map.unsupportedBinary')} />
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: Spacing.item,
  },
});

export default BagRouteMapGateView;
