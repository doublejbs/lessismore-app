import { FC, useState } from 'react';
import { Layer, RasterSource } from '@maplibre/maplibre-react-native';
import {
  getSatelliteTileUrlTemplate,
  SATELLITE_ATTRIBUTION,
  SATELLITE_BEFORE_LAYER_ID,
  SATELLITE_HIDDEN_LAYERS,
  SATELLITE_LAYER_ID,
  SATELLITE_MAX_ZOOM,
  SATELLITE_SOURCE_ID,
  SATELLITE_TILE_SIZE,
} from '@/model/map/SatelliteBasemap';

interface Props {
  // 위성으로 보는지. false면 스타일 그대로(일반 지도)다.
  satellite: boolean;
}

const VISIBLE_LAYOUT = { visibility: 'visible' as const };
const HIDDEN_LAYOUT = { visibility: 'none' as const };
// 모듈 상수 — 렌더마다 새 배열을 넘기면 SDK가 소스를 다시 보낸다.
const SATELLITE_TILES = [getSatelliteTileUrlTemplate()];

/**
 * 위성 보기 레이어 (MAP-7) — 스타일 JSON을 다시 받지 않고 런타임에 바꾼다.
 *
 * - **위성 래스터**: `RasterSource` + `raster` 레이어를 스타일의 첫 도로 레이어 아래(`SATELLITE_BEFORE_LAYER_ID`)에
 *   끼운다 — 도로·등산로·라벨은 위성 위, 앱 레이어(등고선·코스·포인트·내 위치)는 모두 그 위다. 일반 지도로 돌아가면
 *   내린다(소스가 빠지므로 타일 요청도 멈춘다). 출처 문구는 소스의 `attribution`으로 지도 출처 ⓘ에 함께 뜬다.
 * - **숨길 스타일 레이어**(지형 음영·면 채움): 같은 id의 `Layer`를 붙이면 SDK가 기존 레이어를 잡아 `layout`만 바꾼다.
 *   단 그 `Layer`를 내리면 SDK가 **스타일 레이어 자체를 지운다** — 그래서 한 번 위성을 켠 뒤로는 내리지 않고
 *   `visibility`만 오간다. 위성을 한 번도 켜지 않은 지도에는 붙이지 않는다(스타일에 손대지 않는다).
 */
const MapSatelliteLayersView: FC<Props> = ({ satellite }) => {
  const [hasShownSatellite, setHasShownSatellite] = useState(satellite);

  if (satellite && !hasShownSatellite) {
    setHasShownSatellite(true);
  }

  const hiddenLayout = satellite ? HIDDEN_LAYOUT : VISIBLE_LAYOUT;

  return (
    <>
      {satellite ? (
        <RasterSource
          id={SATELLITE_SOURCE_ID}
          tiles={SATELLITE_TILES}
          tileSize={SATELLITE_TILE_SIZE}
          maxzoom={SATELLITE_MAX_ZOOM}
          attribution={SATELLITE_ATTRIBUTION}
        >
          <Layer
            id={SATELLITE_LAYER_ID}
            type='raster'
            beforeId={SATELLITE_BEFORE_LAYER_ID}
          />
        </RasterSource>
      ) : null}
      {hasShownSatellite
        ? SATELLITE_HIDDEN_LAYERS.map(layer => (
            <Layer
              key={layer.id}
              id={layer.id}
              type={layer.type}
              layout={hiddenLayout}
            />
          ))
        : null}
    </>
  );
};

export default MapSatelliteLayersView;
