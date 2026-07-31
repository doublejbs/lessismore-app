import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import {
  GEAR_FILTER_NAMES,
  getGearFilterName,
} from '@/model/gear/GearFilterName';

/**
 * HM-4 창고 미리보기의 계산부. 전부 순수 함수다.
 *
 * 홈은 새 쿼리를 만들지 않는다 — `Warehouse`가 이미 읽어 둔 장비 배열을 받아
 * 클라이언트에서 묶고 자른다.
 */

// 카드에 세우는 장비 수. 칩 줄이 있어 이보다 늘리면 `다가오는 일정`이 화면 밖으로 밀린다.
export const PREVIEW_LIMIT = 4;

export interface HomeCategoryChip {
  filter: GearFilter;
  label: string;
}

/**
 * 칩으로 낼 카테고리. `전체` + **보유 장비가 있는 대분류만** 낸다 —
 * 눌러도 빈 목록만 나오는 칩은 노이즈다.
 *
 * 순서는 `GEAR_FILTER_NAMES`의 선언 순을 따른다(창고 필터와 같은 차례여야 옮겨 다닐 때
 * 헷갈리지 않는다). `GearFilter`는 `const enum`이라 런타임에 순회할 수 없어, 이미
 * 캐논컬 매핑인 이 객체를 순서 소스로 삼는다 — 목록을 한 벌 더 두지 않는다.
 */
export const getCategoryChips = (gears: Gear[]): HomeCategoryChip[] => {
  const owned = new Set(gears.map(gear => gear.getGroupCategory()));

  return (Object.keys(GEAR_FILTER_NAMES) as GearFilter[])
    .filter(filter => filter === GearFilter.All || owned.has(filter))
    .map(filter => ({ filter, label: getGearFilterName(filter) }));
};

/**
 * 선택된 카테고리의 장비를 **최근 추가 순**으로 잘라 준다.
 *
 * 최근 추가 순인 이유는 방금 담은 장비를 확인하려는 동선이 가장 잦고,
 * `createDate`가 이미 있어 새로 계산할 게 없어서다.
 */
export const getPreviewGears = (
  gears: Gear[],
  filter: GearFilter,
  limit: number = PREVIEW_LIMIT
): Gear[] => {
  return gears
    .filter(
      gear => filter === GearFilter.All || gear.getGroupCategory() === filter
    )
    .slice()
    .sort((a, b) => b.getCreateDate() - a.getCreateDate())
    .slice(0, limit);
};

/**
 * 한 번도 안 쓴 장비 수 — `useless` 기록만 있고 `used`가 없는 것.
 *
 * 기록이 아예 없는 장비는 세지 않는다. "안 썼다"고 답한 적이 있어야 정리 대상이지,
 * 담아 두고 아직 여행을 안 간 장비까지 세면 신규 사용자에게 잔소리가 된다.
 */
export const getUnusedCount = (gears: Gear[]): number => {
  return gears.filter(
    gear => gear.getUselessCount() > 0 && gear.getUsedCount() === 0
  ).length;
};
