import { FC, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { AcgLayout, AcgRadius } from '@/constants/DesignTokens';
import {
  BAG_CARD_MAP_LEVEL,
  buildStaticMapUrl,
  STATIC_MAP_REFERER,
} from '@/model/map/StaticMapUrl';
import SnapshotMapBandVariant from './SnapshotMapBandVariant';

const MAP_BAND_HEIGHT = 110;
// 홀로 놓인 밴드와 아래 제목 사이 간격.
const STANDALONE_BOTTOM_GAP = 12;
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
 * 커뮤니티 패킹 스냅샷 카드와 그룹 상세 헤더가 같은 Static Map 단일 소스를 쓴다 — 두 곳이
 * 각자 URL·핀 보정을 두면 같은 좌표가 화면마다 다른 배율로 잡힌다.
 * URL을 만들 수 없거나 이미지가 실패하면 **아무것도 그리지 않는다**(빈 회색 면을 남기지 않는다).
 */
const SnapshotMapBandView: FC<Props> = ({
  latitude,
  longitude,
  variant = SnapshotMapBandVariant.Card,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [failedMapUrl, setFailedMapUrl] = useState<string | null>(null);
  const mapWidth = windowWidth - AcgLayout.screenPadding * 2;
  const mapUrl = useMemo(() => {
    return buildStaticMapUrl({
      latitude,
      longitude,
      widthPx: mapWidth,
      heightPx: MAP_BAND_HEIGHT,
      level: BAG_CARD_MAP_LEVEL,
      withMarker: false,
    });
  }, [latitude, longitude, mapWidth]);

  if (mapUrl === null || mapUrl === failedMapUrl) {
    return null;
  }

  const isStandalone = variant === SnapshotMapBandVariant.Standalone;

  return (
    <View
      style={[styles.band, isStandalone ? styles.standalone : styles.card]}
      accessible={false}
    >
      <Image
        source={{ uri: mapUrl, headers: { Referer: STATIC_MAP_REFERER } }}
        style={StyleSheet.absoluteFill}
        contentFit='cover'
        cachePolicy='memory-disk'
        onError={() => setFailedMapUrl(mapUrl)}
        accessible={false}
      />
      <View style={styles.pinOverlay} pointerEvents='none'>
        <SpotPinView />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  band: {
    height: MAP_BAND_HEIGHT,
    overflow: 'hidden',
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
