import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Acg } from '@/constants/DesignTokens';
import { RouteDisplay } from '@/model/route/RouteDisplay';

interface Props {
  /**
   * 시작·끝을 표시할 코스 — **선택된 코스 하나**다. 여러 코스를 그릴 때 옅게 그린 코스에까지
   * 마커를 달면 코스 수 × 2개의 마커가 지도를 덮고, 어느 끝이 어느 선의 것인지도 읽히지 않는다.
   */
  route: RouteDisplay | null;
}

const MARKER_SIZE = 24;
// 끝점은 마름모(45° 돌린 사각형)라 외접 폭이 √2배다 — 돌린 뒤에도 잘리지 않을 캔버스.
const END_CANVAS_SIZE = 30;
const END_SQUARE_SIZE = 20;
const GLYPH_SIZE = 13;

/**
 * 코스 시작·끝 마커 (GRP-8, BD-11). 그룹 지도와 배낭 코스 화면이 **같은 마커**를 쓴다.
 *
 * 방향이 지도에 보이지 않으면 뒤집기가 그래프에만 반영되고 지도에는 아무 변화가 없다 —
 * 그래서 양끝을 표시하고, 뒤집으면 두 마커의 자리가 바뀐다(뒤집힌 좌표의 첫 점이 시작이다).
 *
 * **모양으로 가른다(색각 이상 대응)**: 시작 = 둥근 사각형 + 재생(▶) 글리프, 끝 = 마름모 + 깃발 글리프.
 * 지도 위의 다른 표식은 전부 원이다 — 등록 포인트(유형 색 원 + 아이콘), 훑기 마커(흰 원 + 잉크 점),
 * 조준 마커(빈 원 + 조준선), 내 위치(파란 점) — 그래서 두 끝점은 원을 쓰지 않는다.
 * 색은 잉크(면) + 흰 테두리 하나로 두고 코스 파랑과 겹치지 않게 한다.
 */
const RouteEndpointMarkersView: FC<Props> = ({ route }) => {
  const coordinates = route?.getSimplified() ?? [];

  if (!route || coordinates.length < 2) {
    return null;
  }

  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  // 방향이 바뀌면 마커를 새로 붙인다 — 같은 키로 좌표만 바꾸면 커스텀 View 마커의 비트맵이
  // 이전 자리에 남는 경우가 있다(네이버 지도 커스텀 마커는 스냅숏이다).
  const keyPrefix = `${route.getId()}:${route.isReversed() ? 'r' : 'f'}`;

  return (
    <>
      <NaverMapMarkerOverlay
        key={`${keyPrefix}:end`}
        latitude={end.lat}
        longitude={end.lng}
        anchor={{ x: 0.5, y: 0.5 }}
        width={END_CANVAS_SIZE}
        height={END_CANVAS_SIZE}
        // 폴리라인 위, 훑기 마커(2)·포인트 아래. 순환 코스라 두 끝이 겹치면 시작이 위다.
        zIndex={1}
      >
        {/* 커스텀 View 마커는 최상위 자식에 collapsable=false가 필요하다(라이브러리 요구사항). */}
        <View collapsable={false} style={styles.endCanvas}>
          <View style={styles.endSquare}>
            <View style={styles.endGlyph}>
              <Ionicons name='flag' size={GLYPH_SIZE - 2} color={Acg.paper} />
            </View>
          </View>
        </View>
      </NaverMapMarkerOverlay>
      <NaverMapMarkerOverlay
        key={`${keyPrefix}:start`}
        latitude={start.lat}
        longitude={start.lng}
        anchor={{ x: 0.5, y: 0.5 }}
        width={MARKER_SIZE}
        height={MARKER_SIZE}
        zIndex={1}
      >
        <View collapsable={false} style={styles.start}>
          <Ionicons
            name='play'
            size={GLYPH_SIZE}
            color={Acg.paper}
            // 재생 삼각형은 무게중심이 왼쪽으로 쏠려 보인다 — 시각 중앙으로 한 칸 민다.
            style={styles.startGlyph}
          />
        </View>
      </NaverMapMarkerOverlay>
    </>
  );
};

const styles = StyleSheet.create({
  start: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: 6,
    backgroundColor: Acg.ink,
    borderWidth: 2,
    borderColor: Acg.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startGlyph: {
    marginLeft: 2,
  },
  endCanvas: {
    width: END_CANVAS_SIZE,
    height: END_CANVAS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSquare: {
    width: END_SQUARE_SIZE,
    height: END_SQUARE_SIZE,
    borderRadius: 3,
    backgroundColor: Acg.ink,
    borderWidth: 2,
    borderColor: Acg.paper,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  // 깃발은 마름모 안에서 똑바로 서야 한다 — 바깥 회전을 되돌린다.
  endGlyph: {
    transform: [{ rotate: '-45deg' }],
  },
});

export default observer(RouteEndpointMarkersView);
