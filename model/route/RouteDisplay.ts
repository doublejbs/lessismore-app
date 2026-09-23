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
  /**
   * 기기에 저장하는 뒤집기 여부의 키(GRP-8). 코스 문서의 `storagePath`라 그룹 코스와 배낭 코스가
   * 한 목록에 섞여도 겹치지 않는다(`RouteDirectionStore`).
   */
  getDirectionKey(): string;
  // 지금 역방향으로 보고 있는지. 서버 값이 아니라 이 기기의 보기 설정이다(GRP-8).
  isReversed(): boolean;
  toggleReversed(): void;
  /**
   * 축약 좌표 — **지금 보는 방향** 순서다(뒤집혔으면 첫 점이 원래의 끝점). 지도가 렌더마다
   * 읽으므로 사본을 만들지 않는다 — 읽기 전용으로만 쓴다.
   */
  getSimplified(): RouteCoordinate[];
  /**
   * 원본 트랙 거리(m). 축약 좌표로 다시 잰 단면 거리(`RouteElevationProfile.totalDistance`)와
   * 달리 목록 행이 읽는 값이라, 고도 그래프의 거리 표시도 이 값을 기준으로 환산한다(GRP-8).
   */
  getDistance(): number;
  getDistanceText(): string;
  // 지금 보는 방향의 고도 상승(m). 뒤집혔으면 원래의 하강이다. 고도가 없으면 `undefined`다.
  getElevationGain(): number | undefined;
  // 지금 보는 방향의 고도 단면. 고도가 없는 코스는 `null`이고, 그때 화면은 그래프 자리를 아예 비운다.
  getElevationProfile(): RouteElevationProfile | null;
}
