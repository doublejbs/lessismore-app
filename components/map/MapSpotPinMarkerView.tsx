import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import PretendardText from '@/components/PretendardText';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

interface Props {
  spot: CampSpot;
  // 마커 id 접두사 — 화면마다 다르게(같은 지도에 같은 id가 둘 서지 않게).
  idPrefix: string;
  // 핀 폭(pt). 높이는 30:40 비율. 기본 30(박지 지도·그룹 지도), 그룹 상세 밴드는 22.
  pinWidth?: number;
  // 핀 위 이름 캡션. 기본 true. 110pt 밴드처럼 좁은 곳은 끈다.
  showCaption?: boolean;
  // 선택 박지(박지 지도 CS-2)면 접근성 상태에 선택을 싣는다.
  selected?: boolean;
  // 누를 수 있으면 버튼이다(접근성 역할 + 44pt 터치 폭). 없으면 터치를 지도로 흘린다.
  onPress?: () => void;
}

// 핀 기본 폭(pt, `SpotPinView` 원본 크기).
const DEFAULT_PIN_WIDTH = 30;
// 핀 원본 비율(폭:높이 = 30:40).
const PIN_ASPECT = 40 / 30;
// 캡션 최대 폭(pt) — 긴 이름이 지도를 가로지르지 않게 한 줄로 자른다(포인트 캡션과 같은 값).
const CAPTION_MAX_WIDTH = 140;
const CAPTION_PADDING_H = 6;
const CAPTION_PADDING_V = 1;
const CAPTION_GAP = 2;
// 누를 수 있는 핀의 최소 터치 폭(HIG 44pt). 높이는 핀(40) + 캡션으로 이미 넘는다.
const MIN_TOUCH_SIZE = 44;

/**
 * 박지 핀 마커 (MAP-2 · CS-2 · GRP-7 · GRP-10) — 앱 공통 핀(`SpotPinView`, 끝점이 좌표) + 위 이름 캡션.
 * 박지 지도의 선택 박지(`CampSiteSpotsLayerView`), 그룹 지도의 연결 박지, 그룹 상세 밴드가 함께 쓴다.
 *
 * - **호출부는 `key={spot.id}`를 준다** — SDK `Marker`는 `id`를 처음 값으로 얼려, 같은 자리에서 박지만 바뀌면
 *   옛 id가 남는다. 키가 바뀌면 마커를 새로 만든다.
 * - 캡션 바탕은 흰 반투명 면(포인트 캡션과 같은 면 — 지도 위 가독성).
 */
const MapSpotPinMarkerView: FC<Props> = ({
  spot,
  idPrefix,
  pinWidth = DEFAULT_PIN_WIDTH,
  showCaption = true,
  selected = false,
  onPress,
}) => {
  const isPressable = !!onPress;

  return (
    <Marker
      id={`${idPrefix}-${spot.id}`}
      lngLat={[spot.location.longitude, spot.location.latitude]}
      anchor='bottom'
      {...(onPress ? { onPress } : {})}
    >
      <View
        collapsable={false}
        pointerEvents={isPressable ? 'auto' : 'none'}
        style={[styles.marker, isPressable && styles.pressable]}
        accessible
        accessibilityLabel={spot.name}
        {...(isPressable ? { accessibilityRole: 'button' as const } : {})}
        {...(selected ? { accessibilityState: { selected: true } } : {})}
      >
        {showCaption ? (
          <PretendardText
            weight='semibold'
            style={styles.caption}
            numberOfLines={1}
          >
            {spot.name}
          </PretendardText>
        ) : null}
        <View style={{ width: pinWidth, height: pinWidth * PIN_ASPECT }}>
          <SpotPinView width={pinWidth} />
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  // 캡션 위, 핀 아래. 핀 끝(아래 가운데)이 좌표다.
  marker: {
    alignItems: 'center',
    gap: CAPTION_GAP,
  },
  pressable: {
    minWidth: MIN_TOUCH_SIZE,
  },
  caption: {
    ...AcgType.meta,
    color: Acg.ink,
    maxWidth: CAPTION_MAX_WIDTH,
    paddingHorizontal: CAPTION_PADDING_H,
    paddingVertical: CAPTION_PADDING_V,
    borderRadius: Radius.pill,
    backgroundColor: Acg.heroCardFill,
    overflow: 'hidden',
  },
});

export default MapSpotPinMarkerView;
