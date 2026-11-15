import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import AppMapView, { AppMapInitialCamera } from '@/components/map/AppMapView';
import MapEndpointMarkersView from '@/components/map/MapEndpointMarkersView';
import MapPointMarkersView from '@/components/map/MapPointMarkersView';
import MapRoutePathLayersView from '@/components/map/MapRoutePathLayersView';
import {
  getHeroContentBounds,
  getHeroEndpointRoute,
  hasHeroRealRoute,
  SubscriptionHeroContent,
} from '@/model/subscription/SubscriptionHeroContent';

interface Props {
  content: SubscriptionHeroContent;
  // 히어로 높이(pt) — 아래 1/3 페이드만큼 카메라 여백을 잡는다.
  height: number;
  // 아래 페이드 높이(pt). 출처 표기(ⓘ)를 그 위로 올린다.
  fadeHeight: number;
  // 상단 세이프에어리어(pt). 코스가 상태 표시줄·닫기 × 아래에 오게 한다.
  topInset: number;
  onLoadFailed: () => void;
}

// SUB-2 ②: 예시 코스는 여행지 중심 줌 12.
const HERO_EXAMPLE_ZOOM = 12;
// 실제 코스가 아주 짧아도(포인트 하나) 최대 줌으로 붙지 않게.
const HERO_MAX_ZOOM = 16;
// 코스 상자 여백. 위는 상태 표시줄 + 출발·도착 말풍선(높이 36) + 여유, 아래는 페이드(높이 1/3) + 24.
const CAMERA_TOP_EXTRA = 48;
const CAMERA_BOTTOM_EXTRA = 24;
const CAMERA_SIDE_PADDING = 40;

const toInitialCamera = (
  content: SubscriptionHeroContent,
  height: number,
  topInset: number
): AppMapInitialCamera => {
  const bounds = hasHeroRealRoute(content)
    ? getHeroContentBounds(content)
    : null;

  if (!bounds) {
    return {
      latitude: content.coordinate.latitude,
      longitude: content.coordinate.longitude,
      zoom: HERO_EXAMPLE_ZOOM,
    };
  }

  return {
    bounds,
    padding: {
      top: topInset + CAMERA_TOP_EXTRA,
      bottom: Math.round(height / 3) + CAMERA_BOTTOM_EXTRA,
      left: CAMERA_SIDE_PADDING,
      right: CAMERA_SIDE_PADDING,
    },
  };
};

/**
 * SUB-2 ① 히어로 지도 본문 — 제스처를 끈 실제 지도(`AppMapView interactive={false}`, MAP-2). 그룹 상세 밴드
 * (GRP-7 `GroupDetailMapBandView`)와 같은 구성이다.
 *
 * - 실제 코스가 있으면 코스 선(모두 같은 굵기) + 가장 긴 코스의 출발·도착 말풍선 + 포인트(compact)를 올리고
 *   코스·포인트 상자에 카메라를 맞춘다. 없으면 여행지 중심 줌 12 — 예시 코스는 부모가 SVG로 위에 그린다.
 * - 출처는 지도 자체의 attribution(좌하단 ⓘ)이 맡는다(MAP-1). 아래 1/3 페이드가 그 자리를 덮으므로 페이드
 *   위로 올린다. 나침반·로고는 끈다.
 * - 장식이라 접근성 트리에서 뺀다(닫기 버튼만 남는다).
 * - MapLibre SDK를 최상위 import하므로 부모(`SubscriptionHeroView`)는 이 파일을 `createMapLibreViewLoader`로
 *   싣는다(옛 바이너리 방어). 웹은 `.web.tsx`.
 */
const SubscriptionHeroMapView = ({
  content,
  height,
  fadeHeight,
  topInset,
  onLoadFailed,
}: Props) => {
  // 지도는 붙일 때 한 번만 카메라를 읽는다 — 회전 등으로 높이가 바뀌어도 새로 맞추지 않는다.
  const [initialCamera] = useState(() =>
    toInitialCamera(content, height, topInset)
  );
  const isRealRoute = hasHeroRealRoute(content);

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessible={false}
      accessibilityElementsHidden={true}
      importantForAccessibility='no-hide-descendants'
    >
      <AppMapView
        style={StyleSheet.absoluteFill}
        initialCamera={initialCamera}
        interactive={false}
        showCompass={false}
        attributionBottomOffset={fadeHeight}
        maxZoom={HERO_MAX_ZOOM}
        onLoadFailed={onLoadFailed}
      >
        {isRealRoute ? (
          <>
            <MapRoutePathLayersView
              routes={content.routes}
              selectedRouteId={null}
              uniform
            />
            <MapEndpointMarkersView route={getHeroEndpointRoute(content)} />
            <MapPointMarkersView
              points={content.points}
              selectedPointId={null}
              compact
            />
          </>
        ) : null}
      </AppMapView>
    </View>
  );
};

// observer — 코스 선·끝점이 뒤집기 설정(observable)을 읽는다.
export default observer(SubscriptionHeroMapView);
