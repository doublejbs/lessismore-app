import { FC, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Color, Radius, AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import {
  buildStaticMapUrl,
  STATIC_MAP_REFERER,
} from '@/model/map/StaticMapUrl';

interface Props {
  location: BagLocation;
  onPress: () => void;
}

// 미리보기 박스 높이. 아래 레벨 계산의 기준값이라 스타일과 상수를 하나로 묶는다.
const MAP_PREVIEW_HEIGHT = 180;

/**
 * 여행지 허브(DST-8) 지도 미리보기의 줌 레벨.
 *
 * Static Map(256px 타일) 기준 세로 스팬 = `360 × 높이 / (256 × 2^level)`
 * (`StaticMapUrl.ts`의 `BAG_CARD_MAP_LEVEL` 산식과 동일). 이 미리보기 높이(180pt)에 **14**를
 * 넣으면 스팬이 약 0.0155도(≈1.6km) — 옛 동적 지도(`deltaToZoom(0.05)`)가 이 박스 안에서
 * 실제로 보여주던 스팬(≈ `0.05 × 180 / 화면높이`, 대표 기기에서 약 1.1~1.5km)과 같은 자리다.
 * 배낭 카드 밴드(BAG-1, 110pt·레벨 13·2km)보다 박스가 크고 목적이 "확인"이라 한 단 더
 * 당겨(14) 동네보다 살짝 좁은, 거리·건물 윤곽이 보이는 수준을 쓴다.
 */
const MAP_PREVIEW_LEVEL = 14;

// 여행지 허브(DST-8)의 지도 미리보기. 2026-08-13부터 동적 지도(뷰 생성당 과금) 대신 NCP
// Static Map 이미지(요청당 과금 + 기기 캐시)를 쓴다 — 배낭 목록 카드(BAG-1)와 같은 유틸
// (`model/map/StaticMapUrl.ts`) 공유. 탭하면 공용 선택기를 연다. 웹은 상위
// (BagDestinationHubView)에서 렌더하지 않는다 — 여기선 네이티브만 다룬다.
const BagDestinationMapPreviewView: FC<Props> = ({ location, onPress }) => {
  const { width: windowWidth } = useWindowDimensions();
  /**
   * 로드에 실패한 URL. 실패 플래그를 boolean으로 두면 URL이 바뀌어도(여행지 변경) 실패 상태가
   * 남는다 — URL을 담아 두면 새 URL에서 자연히 한 번 더 시도한다(BAG-1과 동일 패턴).
   */
  const [failedMapUrl, setFailedMapUrl] = useState<string | null>(null);

  // 미리보기 박스 폭 = 화면 폭 − 좌우 화면 패딩(BagDestinationHubView의 scrollContent가
  // 같은 값을 쓴다). 요청 w/h를 표시 박스와 같은 비율로 잡아야 응답 이미지의 네이버 로고·
  // 저작권 고지가 크롭되지 않는다(StaticMapUrl.ts 저작권 제약).
  const previewWidth = windowWidth - AcgLayout.screenPadding * 2;

  const mapUrl = useMemo(() => {
    return buildStaticMapUrl({
      latitude: location.latitude,
      longitude: location.longitude,
      widthPx: previewWidth,
      heightPx: MAP_PREVIEW_HEIGHT,
      level: MAP_PREVIEW_LEVEL,
      // 마커는 이미지에 싣지 않는다 — 앱 핀(SpotPinView)을 위에 얹는다(BAG-1과 동일,
      // NCP 커스텀 아이콘 파라미터는 렌더되지 않음을 2026-08-13 실측).
      withMarker: false,
    });
  }, [location.latitude, location.longitude, previewWidth]);

  /**
   * 그릴지. URL을 못 만든 경우(키 미설정·좌표 이상)와 로드 실패를 **같은 폴백**으로 수렴시켜
   * 아예 렌더하지 않는다 — 빈 회색 면이나 깨진 이미지 아이콘을 남기지 않는다. 미리보기가
   * 사라져도 아래 여행지 정보 행이 남아 화면은 그대로 성립한다.
   */
  const showPreview = mapUrl !== null && mapUrl !== failedMapUrl;

  if (!showPreview) {
    return null;
  }

  const handleError = () => {
    setFailedMapUrl(mapUrl);
  };

  return (
    <View style={styles.container}>
      {/* Referer가 없으면 401(NCP 등록 도메인 검사) — StaticMapUrl.ts 참고. */}
      <Image
        source={{ uri: mapUrl, headers: { Referer: STATIC_MAP_REFERER } }}
        style={StyleSheet.absoluteFill}
        contentFit='cover'
        cachePolicy='memory-disk'
        transition={160}
        onError={handleError}
        accessible={false}
      />

      {/* 앱 공통 박지 핀 — 끝점이 여행지 좌표(이미지 중심)에 닿게 앵커한다. */}
      <View style={styles.pinOverlay} pointerEvents='none'>
        <SpotPinView />
      </View>

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
    backgroundColor: Color.thumbBg,
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
