import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapAttributionNoteView from '@/components/map/MapAttributionNoteView';
import { STATIC_MAP_FADE_DURATION } from '@/components/map/StaticMapBand';
import StaticMapImageStatus from '@/components/map/StaticMapImageStatus';
import useStaticMapImage from '@/components/map/useStaticMapImage';
import { Acg, Spacing } from '@/constants/DesignTokens';
import { SubscriptionHeroCoordinate } from '@/model/subscription/SubscriptionHeroLocation';
import SubscriptionCloseButtonView from './SubscriptionCloseButtonView';

// SUB-2: 히어로 높이 = 화면 높이의 38%, 줌 12(MAP-3 정적 썸네일).
const HERO_HEIGHT_RATIO = 0.38;
const HERO_MAP_ZOOM = 12;

// 아래쪽 1/3을 순백으로 페이드해 지면과 잇는다.
const HERO_FADE_RATIO = 1 / 3;
const HERO_FADE_COLORS = ['rgba(255,255,255,0)', Acg.paper] as const;

// 핀 꼭지점을 지도 중심에 맞추는 보정(핀 폭 30 · 높이 40 기준 — 스냅샷 밴드와 같은 값).

// 닫기 ×를 화면 모서리에서 띄우는 거리(44pt 원의 바깥 여백).
const CLOSE_BUTTON_EDGE_INSET = 16;

interface Props {
  // null이면 아직 중심을 고르는 중 — 연회색 면만 그린다.
  coordinate: SubscriptionHeroCoordinate | null;
  isCloseDisabled: boolean;
  onClose: () => void;
}

/**
 * SUB-2 ① 히어로 — 화면 폭 전체 정적 지도(MAP-3) + 가운데 앱 핀 + 아래 1/3 순백 페이드 + 좌상단 닫기 ×
 * + 우하단 `© OpenStreetMap`. 썸네일을 만들지 못하면(실패·오프라인·웹) 연회색 면만 남긴다.
 * 지도는 장식이라 접근성 트리에서 뺀다(닫기 버튼만 남는다).
 */
const SubscriptionHeroView = ({
  coordinate,
  isCloseDisabled,
  onClose,
}: Props) => {
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // 표시에 실패한 썸네일 URI(그 사이 캐시 파일이 지워진 경우 등) — 새 URI가 오면 다시 그린다.
  const [failedMapUri, setFailedMapUri] = useState<string | null>(null);
  const height = Math.round(windowHeight * HERO_HEIGHT_RATIO);
  const mapImage = useStaticMapImage(
    coordinate
      ? {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          zoom: HERO_MAP_ZOOM,
          width,
          height,
        }
      : null
  );
  const mapUri =
    mapImage.status === StaticMapImageStatus.Ready &&
    mapImage.uri !== failedMapUri
      ? mapImage.uri
      : null;

  const handleMapError = () => {
    setFailedMapUri(mapUri);
  };

  return (
    <View style={[styles.hero, { height }]}>
      {mapUri !== null ? (
        <View
          style={StyleSheet.absoluteFill}
          accessible={false}
          accessibilityElementsHidden={true}
          importantForAccessibility='no-hide-descendants'
          pointerEvents='none'
        >
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
          <LinearGradient
            colors={HERO_FADE_COLORS}
            style={[styles.fade, { height: height * HERO_FADE_RATIO }]}
          />
          <MapAttributionNoteView />
        </View>
      ) : null}

      <View
        style={[
          styles.closeSlot,
          { top: insets.top + Spacing.item / 2, left: CLOSE_BUTTON_EDGE_INSET },
        ]}
      >
        <SubscriptionCloseButtonView
          isFloating={true}
          disabled={isCloseDisabled}
          onClose={onClose}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 바탕은 연회색 면 — 썸네일이 그 위로 페이드한다(실패·오프라인이면 이 면만 남는다).
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeSlot: {
    position: 'absolute',
  },
});

// observer — 정적 지도 훅이 연결 상태를 읽는다(연결이 돌아오면 다시 시도).
export default observer(SubscriptionHeroView);
