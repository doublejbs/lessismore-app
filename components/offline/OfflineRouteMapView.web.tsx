import { FC } from 'react';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRouteList from '@/model/bag-route/BagRouteList';
import OfflineMapReason from '@/model/offline/OfflineMapReason';

interface Props {
  bagRouteList: BagRouteList;
  bagPointList: BagPointList;
  reason: OfflineMapReason;
  topInset: number;
}

/**
 * 웹 대체 (OF-6) — 웹에는 지도가 없고(APP-5) 오프라인 기능도 없다. `BagRouteView`는 웹에서 이 뷰를
 * 렌더하지 않지만, 웹 번들이 MapLibre 네이티브 모듈을 끌어오지 않도록 플랫폼 확장자로 갈라 둔다.
 */
const OfflineRouteMapView: FC<Props> = () => {
  return null;
};

export default OfflineRouteMapView;
