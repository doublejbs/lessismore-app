import { Image, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { ROUTE_CASING_COLOR } from '@/components/map/MapConstants';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import {
  getPointTypeColor,
  getPointTypeIcon,
} from '@/model/point/PointLabels';
import { ROUTE_COLOR } from '@/model/route/RouteColors';
import { ROUTE_ENDPOINT_LABELS } from '@/model/route/RouteEndpointLabels';
import {
  getExampleRouteEnd,
  getExampleRoutePath,
  getExampleRoutePoints,
  getExampleRouteStart,
} from '@/model/subscription/SubscriptionHeroExampleRoute';

interface Props {
  width: number;
  height: number;
}

// 코스 화면 선과 같은 굵기 — 흰 테두리 10 위 파란 선 6(`MapRoutePathLayersView`).
const ROUTE_WIDTH = 6;
const ROUTE_OUTLINE_WIDTH = 10;
// 포인트 마커 — `MapPointMarkerView`의 기본(캡션 뺀) 원과 같은 치수.
const POINT_CIRCLE = 28;
const POINT_ICON = 15;
const POINT_BORDER = 2;

/**
 * SUB-2 ② 예시 코스 일러스트 — 실제 코스가 없을 때 지도 위에 코스 화면과 같은 시각 문법으로 그린다:
 * 흰 테두리 위 파란 선(S자), 양 끝 출발·도착 말풍선, 선 위 물보급·쉼터·주의 포인트 마커.
 *
 * - 지도 `Marker`가 아니라 RN 뷰·SVG로 절대 배치한다 — 지도가 못 떠도(옛 바이너리·오프라인·로드 실패 →
 *   연회색 면) 그대로 그린다. 위치는 히어로 폭·높이의 고정 비율(`SubscriptionHeroExampleRoute`)이다.
 * - 포인트 마커는 `MapPointMarkerView`의 생김새(유형색 원 28 + 흰 테두리 + 아이콘)를 그대로 옮겼다 — 그 파일은
 *   MapLibre `Marker`를 최상위 import해 지도 없는 자리에서 쓸 수 없다.
 * - 캡션 없는 일러스트라 접근성 트리에서 뺀다.
 */
const SubscriptionHeroExampleRouteView = ({ width, height }: Props) => {
  const labels = ROUTE_ENDPOINT_LABELS[app.getL10n().language];
  const path = getExampleRoutePath(width, height);
  const start = getExampleRouteStart(width, height);
  const end = getExampleRouteEnd(width, height);
  const points = getExampleRoutePoints(width, height);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents='none'
      accessible={false}
      accessibilityElementsHidden={true}
      importantForAccessibility='no-hide-descendants'
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={path}
          stroke={ROUTE_CASING_COLOR}
          strokeWidth={ROUTE_OUTLINE_WIDTH}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
        />
        <Path
          d={path}
          stroke={ROUTE_COLOR}
          strokeWidth={ROUTE_WIDTH}
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
        />
      </Svg>

      {points.map(({ type, position }) => (
        <View
          key={type}
          style={[
            styles.pointCircle,
            {
              left: position.x - POINT_CIRCLE / 2,
              top: position.y - POINT_CIRCLE / 2,
              backgroundColor: getPointTypeColor(type),
            },
          ]}
        >
          <Ionicons
            name={getPointTypeIcon(type)}
            size={POINT_ICON}
            color={Acg.paper}
          />
        </View>
      ))}

      {/* 말풍선 꼬리 끝이 끝점을 가리킨다 — 아래 가운데를 좌표에 둔다(`MapEndpointMarkersView`와 같은 앵커). */}
      <Image
        source={labels.end.source}
        style={[
          styles.endpoint,
          {
            left: end.x - labels.end.width / 2,
            top: end.y - labels.end.height,
            width: labels.end.width,
            height: labels.end.height,
          },
        ]}
      />
      <Image
        source={labels.start.source}
        style={[
          styles.endpoint,
          {
            left: start.x - labels.start.width / 2,
            top: start.y - labels.start.height,
            width: labels.start.width,
            height: labels.start.height,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pointCircle: {
    position: 'absolute',
    width: POINT_CIRCLE,
    height: POINT_CIRCLE,
    borderRadius: POINT_CIRCLE / 2,
    borderWidth: POINT_BORDER,
    borderColor: Acg.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endpoint: {
    position: 'absolute',
    resizeMode: 'contain',
  },
});

// observer — 말풍선 이미지가 현재 앱 언어를 따른다.
export default observer(SubscriptionHeroExampleRouteView);
