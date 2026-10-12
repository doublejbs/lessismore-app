import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Radius, AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import MapAttributionNoteView from '@/components/map/MapAttributionNoteView';
import useStaticMapImage from '@/components/map/useStaticMapImage';
import StaticMapImageStatus from '@/components/map/StaticMapImageStatus';
import {
  STATIC_MAP_FADE_DURATION,
  STATIC_MAP_LOADING_FILL,
} from '@/components/map/StaticMapBand';

interface Props {
  location: BagLocation;
  onPress: () => void;
}

// 미리보기 박스 높이. 아래 레벨 계산의 기준값이라 스타일과 상수를 하나로 묶는다.
const MAP_PREVIEW_HEIGHT = 180;

/**
 * 여행지 허브(DST-8) 지도 미리보기의 줌 레벨.
 *
 * 세로 스팬 ≈ `360 × 높이 / (256 × 2^level)`(배낭 카드 밴드의 `BAG_CARD_MAP_LEVEL`과 같은 산식,
 * MapLibre도 네이버 때와 같은 줌 체계 — MAP-1). 이 미리보기 높이(180pt)에 **14**를
 * 넣으면 스팬이 약 0.0155도(≈1.6km) — 옛 동적 지도(`deltaToZoom(0.05)`)가 이 박스 안에서
 * 실제로 보여주던 스팬(≈ `0.05 × 180 / 화면높이`, 대표 기기에서 약 1.1~1.5km)과 같은 자리다.
 * 배낭 카드 밴드(BAG-1, 110pt·레벨 13·2km)보다 박스가 크고 목적이 "확인"이라 한 단 더
 * 당겨(14) 동네보다 살짝 좁은, 거리·건물 윤곽이 보이는 수준을 쓴다.
 */
const MAP_PREVIEW_LEVEL = 14;

// 여행지 허브(DST-8)의 지도 미리보기. 기기에서 MapLibre로 렌더한 정적 썸네일(MAP-3)을 쓴다 —
// 배낭 목록 카드(BAG-1)와 같은 훅(`useStaticMapImage`) 공유. 탭하면 공용 선택기를 연다. 웹은 상위
// (BagDestinationHubView)에서 렌더하지 않는다 — 여기선 네이티브만 다룬다.
const BagDestinationMapPreviewView: FC<Props> = ({ location, onPress }) => {
  const { width: windowWidth } = useWindowDimensions();
  /**
   * 표시에 실패한 썸네일 URI(그 사이 캐시 파일이 지워진 경우 등). URI를 담아 두면 여행지가 바뀌어
   * 새 URI가 오면 자연히 다시 그린다(BAG-1과 동일 패턴).
   */
  const [failedMapUri, setFailedMapUri] = useState<string | null>(null);

  // 미리보기 박스 폭 = 화면 폭 − 좌우 화면 패딩(BagDestinationHubView의 scrollContent가
  // 같은 값을 쓴다). 썸네일을 표시 박스와 같은 비율(pt)로 만들어 `cover`에 크롭이 없다.
  const previewWidth = windowWidth - AcgLayout.screenPadding * 2;

  // 마커는 이미지에 싣지 않는다 — 앱 핀(SpotPinView)을 위에 얹는다(BAG-1과 동일).
  const mapImage = useStaticMapImage({
    latitude: location.latitude,
    longitude: location.longitude,
    zoom: MAP_PREVIEW_LEVEL,
    width: previewWidth,
    height: MAP_PREVIEW_HEIGHT,
  });
  const mapUri =
    mapImage.status === StaticMapImageStatus.Ready &&
    mapImage.uri !== failedMapUri
      ? mapImage.uri
      : null;
  const isLoading = mapImage.status === StaticMapImageStatus.Loading;

  /**
   * 그릴지. 생성 중에는 로딩 면으로 자리를 잡아 두고(이미지가 오면 페이드), 좌표 이상·생성 실패·
   * 표시 실패는 **같은 폴백**으로 수렴시켜 아예 렌더하지 않는다 — 빈 회색 면이나 깨진 이미지
   * 아이콘을 남기지 않는다. 미리보기가 사라져도 아래 여행지 정보 행이 남아 화면은 그대로 성립한다.
   */
  if (!isLoading && mapUri === null) {
    return null;
  }

  const handleError = () => {
    setFailedMapUri(mapUri);
  };

  return (
    <View style={styles.container}>
      {mapUri !== null ? (
        <>
          {/* 로컬 `file://`이라 expo-image 디스크 캐시는 겹치기만 한다. */}
          <Image
            source={{ uri: mapUri }}
            style={StyleSheet.absoluteFill}
            contentFit='cover'
            cachePolicy='none'
            transition={STATIC_MAP_FADE_DURATION}
            onError={handleError}
            accessible={false}
          />

          {/* 앱 공통 박지 핀 — 끝점이 여행지 좌표(이미지 중심)에 닿게 앵커한다. */}
          <View style={styles.pinOverlay} pointerEvents='none'>
            <SpotPinView />
          </View>

          <MapAttributionNoteView />
        </>
      ) : null}

      {/* 이미지는 제스처가 없는 정적 그림이라 탭 처리는 오버레이가 전담한다. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('bagDestination.mapChange')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: MAP_PREVIEW_HEIGHT,
    borderRadius: Radius.card,
    overflow: 'hidden',
    // 로딩 면 — 이미지가 그 위로 페이드한다.
    backgroundColor: STATIC_MAP_LOADING_FILL,
  },
  // 핀 폭 30·높이 40 — 끝점(하단 중앙)이 박스 중심에 오도록 절반 폭/전체 높이만큼 당긴다.
  pinOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -40,
  },
});

export default observer(BagDestinationMapPreviewView);
