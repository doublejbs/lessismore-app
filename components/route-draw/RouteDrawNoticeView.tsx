import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import MapNoticeLineView from '@/components/map/MapNoticeLineView';
import app from '@/model/app/App';
import RouteDraw from '@/model/route-draw/RouteDraw';

interface Props {
  routeDraw: RouteDraw;
}

/**
 * 그리기 모드 상단 안내 줄 (RD-2) — 지도 상단 안내 한 줄(`MapNoticeLineView`) 문법 그대로. 첫 점을 찍으면
 * "어떻게 이어 가는지·언제 저장되는지"로 바뀐다.
 */
const RouteDrawNoticeView: FC<Props> = ({ routeDraw }) => {
  const l10n = app.getL10n();
  const label = l10n.t(
    routeDraw.getPointCount() === 0
      ? 'routeDraw.noticeEmpty'
      : 'routeDraw.noticeContinue'
  );

  return <MapNoticeLineView label={label} />;
};

export default observer(RouteDrawNoticeView);
