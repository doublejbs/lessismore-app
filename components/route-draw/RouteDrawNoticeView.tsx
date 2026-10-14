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
  // 첫 안내는 지금 연결 방식(등산로 따라 / 직선 — RD-6)을 말한다. 토글을 바꾸면 바로 바뀐다.
  const getEmptyKey = () =>
    routeDraw.isTrailEnabled()
      ? 'routeDraw.noticeEmptyTrail'
      : 'routeDraw.noticeEmpty';
  const label = l10n.t(
    routeDraw.getPointCount() === 0 ? getEmptyKey() : 'routeDraw.noticeContinue'
  );

  return <MapNoticeLineView label={label} />;
};

export default observer(RouteDrawNoticeView);
