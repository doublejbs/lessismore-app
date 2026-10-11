import PointType from './PointType';

/**
 * 지도에 찍히는 포인트 한 개의 공통 모양 (GRP-9 · BD-14).
 *
 * 그룹 포인트(`GroupPoint`, DM-29)와 배낭 포인트(`BagPoint`, DM-33)는 필드 구조가 같고 사는 곳만
 * 다르다. 마커·카드·입력 시트·고도 그래프 표시는 이 모양만 보고 그린다 — 작성자·권한처럼 한쪽에만
 * 있는 것은 각 화면이 따로 붙인다.
 */
interface MapPoint {
  getId(): string;
  getType(): PointType;
  getLatitude(): number;
  getLongitude(): number;
  getTitle(): string;
  getDescription(): string | undefined;
  getCreatedAt(): Date;
}

export default MapPoint;
