import { FC, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { AcgLayout, AcgRadius } from '@/constants/DesignTokens';
import MapAttributionNoteView from '@/components/map/MapAttributionNoteView';
import useStaticMapImage from '@/components/map/useStaticMapImage';
import StaticMapImageStatus from '@/components/map/StaticMapImageStatus';
import {
  BAG_CARD_MAP_LEVEL,
  STATIC_MAP_FADE_DURATION,
  STATIC_MAP_LOADING_FILL,
} from '@/components/map/StaticMapBand';
import SnapshotMapBandVariant from './SnapshotMapBandVariant';

// 그룹 상세의 코스 지도 밴드(GRP-7)가 같은 높이·간격을 쓴다 — 박지 밴드와 번갈아 서는 자리다.
export const MAP_BAND_HEIGHT = 110;
// 홀로 놓인 밴드와 아래 제목 사이 간격.
export const STANDALONE_BOTTOM_GAP = 12;
// 핀 꼭지점을 지도 중심에 맞추는 보정(핀 폭 30 · 높이 40 기준).
const PIN_OFFSET_X = -15;
const PIN_OFFSET_Y = -40;

interface Props {
  latitude: number;
  longitude: number;
  variant?: SnapshotMapBandVariant;
}

/**
 * 스냅샷·그룹 헤더의 지도 밴드 (CM-4 · GRP-4).
 *
 * 커뮤니티 패킹 스냅샷 카드와 그룹 상세 헤더가 같은 정적 썸네일(MAP-3, 기기 렌더 PNG)을 쓴다 —
 * 두 곳이 각자 줌·핀 보정을 두면 같은 좌표가 화면마다 다른 배율로 잡힌다.
 * 생성 중에는 로딩 면으로 자리를 잡고, 좌표 이상·생성 실패·표시 실패면 **아무것도 그리지 않는다**
 * (빈 회색 면을 남기지 않는다).
 */
const SnapshotMapBandView: FC<Props> = ({
  latitude,
  longitude,
  variant = SnapshotMapBandVariant.Card,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  // 표시에 실패한 썸네일 URI(그 사이 캐시 파일이 지워진 경우 등) — 새 URI가 오면 다시 그린다.
  const [failedMapUri, setFailedMapUri] = useState<string | null>(null);
  const mapWidth = windowWidth - AcgLayout.screenPadding * 2;
  const mapImage = useStaticMapImage({
    latitude,
    longitude,
    zoom: BAG_CARD_MAP_LEVEL,
    width: mapWidth,
    height: MAP_BAND_HEIGHT,
  });
  const mapUri =
    mapImage.status === StaticMapImageStatus.Ready &&
    mapImage.uri !== failedMapUri
      ? mapImage.uri
      : null;
  const isLoading = mapImage.status === StaticMapImageStatus.Loading;

  if (!isLoading && mapUri === null) {
    return null;
  }

  const handleMapError = () => {
    setFailedMapUri(mapUri);
  };

  const isStandalone = variant === SnapshotMapBandVariant.Standalone;

  return (
    <View
      style={[styles.band, isStandalone ? styles.standalone : styles.card]}
      accessible={false}
    >
      {mapUri !== null ? (
        <>
          {/* 로컬 `file://`이라 expo-image 디스크 캐시는 겹치기만 한다. */}
          <Image
            source={{ uri: mapUri }}
            style={StyleSheet.absoluteFill}
            contentFit='cover'
            cachePolicy='none'
            transition={STATIC_MAP_FADE_DURATION}
            onError={handleMapError}
            accessible={false}
          />
          <View style={styles.pinOverlay} pointerEvents='none'>
            <SpotPinView />
          </View>
          <MapAttributionNoteView />
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 바탕은 로딩 면 — 이미지가 그 위로 페이드한다.
  band: {
    height: MAP_BAND_HEIGHT,
    overflow: 'hidden',
    backgroundColor: STATIC_MAP_LOADING_FILL,
  },
  card: {
    borderTopLeftRadius: AcgRadius.thumb,
    borderTopRightRadius: AcgRadius.thumb,
  },
  standalone: {
    marginBottom: STANDALONE_BOTTOM_GAP,
    borderRadius: AcgRadius.thumb,
  },
  pinOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: PIN_OFFSET_X,
    marginTop: PIN_OFFSET_Y,
  },
});

export default SnapshotMapBandView;
