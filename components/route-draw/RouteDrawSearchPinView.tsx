import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import MapPinCaptionMarkerView from '@/components/map/MapPinCaptionMarkerView';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import RouteDrawSearch from '@/model/route-draw/RouteDrawSearch';

interface Props {
  search: RouteDrawSearch;
}

/**
 * 그리기 검색의 임시 핀 (RD-5) — 박지 핀과 같은 이름 캡션 핀(`MapPinCaptionMarkerView`)을 **회색**으로.
 * 비대화형이다 — 터치는 지도로 흘러 점 찍기가 된다. 핀이 바뀌면 `key`로 마커를 새로 만든다
 * (SDK `Marker`는 `id`를 처음 값으로 얼린다).
 */
const RouteDrawSearchPinView: FC<Props> = ({ search }) => {
  const pin = search.getPin();

  if (!pin) {
    return null;
  }

  const markerId = `route-draw-search-pin-${pin.latitude},${pin.longitude}`;

  return (
    <MapPinCaptionMarkerView
      key={markerId}
      markerId={markerId}
      name={pin.name}
      latitude={pin.latitude}
      longitude={pin.longitude}
      accessibilityLabel={app
        .getL10n()
        .t('routeDraw.searchPinLabel', { name: pin.name })}
      fill={Acg.textSecondary}
      stroke={Acg.paper}
      dot={Acg.paper}
    />
  );
};

export default observer(RouteDrawSearchPinView);
