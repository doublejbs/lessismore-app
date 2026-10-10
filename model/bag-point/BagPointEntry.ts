import MapPoint from '@/model/point/MapPoint';

/**
 * 배낭 코스 화면의 포인트 한 건 (BD-14).
 *
 * 내 배낭 포인트와 **연결된 그룹의 포인트**가 한 지도·목록에 섞인다(코스 `BagRouteEntry`와 같은
 * 문법). 그룹 포인트는 출처를 달고 읽기 전용으로만 보인다 — 고치거나 지우는 일은 그룹 지도가 한다.
 */
export interface BagPointEntry {
  // 목록·선택의 키. 배낭 포인트와 그룹 포인트가 한 목록에 있으므로 출처를 함께 담는다.
  key: string;
  point: MapPoint;
  // 그룹에서 온 읽기 전용 포인트면 그 그룹 이름. 내 포인트면 키가 없다.
  groupName?: string;
  // 내 배낭 포인트인지 — 수정·삭제는 내 포인트에만 있다.
  owned: boolean;
}
