import { RouteElevationProfile } from './RouteElevation';
import { RouteCoordinate } from './RouteData';

/**
 * 화면이 코스를 그리는 데 필요한 것 전부 (GRP-8, BD-11).
 *
 * 지도 폴리라인·고도 그래프·목록 행은 그룹 코스(`GroupRoute`)와 배낭 코스(`BagRoute`)를
 * 가리지 않는다 — 둘을 한 목록에 섞어 보여주는 화면도 있다(BD-11 연결 그룹 코스).
 * 그래서 공용 뷰는 모델 클래스가 아니라 이 인터페이스를 받는다.
 */
export interface RouteDisplay {
  getId(): string;
  getName(): string;
  // 축약 좌표. 지도가 렌더마다 읽으므로 사본을 만들지 않는다 — 읽기 전용으로만 쓴다.
  getSimplified(): RouteCoordinate[];
  getDistanceText(): string;
  // 고도 상승(m). GPX에 고도가 없으면 `undefined`다.
  getElevationGain(): number | undefined;
  // 고도가 없는 코스는 `null`이고, 그때 화면은 그래프 자리를 아예 비운다.
  getElevationProfile(): RouteElevationProfile | null;
}
