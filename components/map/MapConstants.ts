import type { ViewPadding } from '@maplibre/maplibre-react-native';
import { Acg } from '@/constants/DesignTokens';
import { CURRENT_LOCATION_DELTA } from '@/model/map/MapCamera';
import { deltaToZoom } from '@/model/map/MapZoom';

/**
 * 지도 화면 공용 값 (MAP-2) — 배낭 코스·그룹 지도·박지 지도·여행지 선택기가 같은 값을 쓴다.
 * (SDK는 타입만 import한다 — 이 파일은 MapLibre 네이티브 모듈을 싣지 않는다.)
 */

// 화면이 카메라를 옮길 때의 기본 이동 시간(ms). SDK `fitBounds` 기본(2초 `fly`)은 너무 길다.
export const CAMERA_MOVE_DURATION = 500;

// 코스·그룹 지도의 최대 줌.
export const MAX_ZOOM = 18;

// `내 위치`로 옮길 때의 줌(약 0.05° 범위 — 배낭 코스·그룹 지도 공통).
export const CURRENT_LOCATION_ZOOM = deltaToZoom(CURRENT_LOCATION_DELTA);

// 상단 오버레이(안내 줄·칩)와 지도 장식(나침반·안드로이드 축척 막대) 사이 여백.
export const OVERLAY_GAP = 8;

// 내 위치 부채꼴 회전을 다시 그릴 최소 방위 변화(도) — 지도를 돌리는 동안 매 프레임 리렌더하지 않게.
export const MIN_BEARING_DELTA = 1;

// 지도 위 선(코스·운동 경로)의 흰 테두리 — 지면(`Acg.paper`)과 같은 흰색이라 선이 지형 위에서 떠 보인다.
export const ROUTE_CASING_COLOR = Acg.paper;

/**
 * 이동 여백 없음. 끝점 이동(`useRouteEndpointState`)이 준 `padding`은 Android 카메라에 남아 다음 이동의
 * 중심을 틀어 놓는다 — 여백이 필요 없는 이동(내 위치·포인트·방향 모드 따라가기)은 이 값을 명시한다.
 */
export const NO_CAMERA_PADDING: ViewPadding = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
