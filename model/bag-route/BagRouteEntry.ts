import { RouteDisplay } from '@/model/route/RouteDisplay';

/**
 * 배낭 코스 화면의 목록 한 줄 (BD-11).
 *
 * 내 배낭 코스와 **연결된 그룹의 코스**가 한 목록에 섞인다. 그룹 코스는 출처를 달고 읽기
 * 전용으로만 보인다 — 여기서 지우거나 고칠 수 없고, 그 일은 그룹 화면이 한다.
 */
export interface BagRouteEntry {
  // 목록·선택의 키. 배낭 코스와 그룹 코스가 한 목록에 있으므로 출처를 함께 담는다.
  key: string;
  route: RouteDisplay;
  // 그룹에서 온 읽기 전용 코스면 그 그룹 이름. 내 코스면 키가 없다.
  groupName?: string;
  // 내 배낭 코스인지 — 삭제·`그룹에 올리기`는 내 코스에만 있다.
  owned: boolean;
}
