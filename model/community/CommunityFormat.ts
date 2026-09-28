import {
  formatBagSnapshotDateRange,
  formatBagSnapshotRelativeTime,
} from '@/model/bag-snapshot/BagSnapshotFormat';
import { getGroupForCategory } from '@/model/gear/GearCategoryGroups';
import GearFilter from '@/model/gear/GearFilter';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';
import { CommunityBagSnapshotGear } from './CommunityData';

/**
 * 커뮤니티 스냅샷 기간 표기는 게시글이 남는 형식이라 **로케일과 무관한 점 구분 표기**를
 * 유지한다(피드·상세가 같은 값을 보여야 한다).
 */
const SNAPSHOT_DATE_FORMAT = 'YYYY.MM.DD';
const SNAPSHOT_DATE_RANGE_SEPARATOR = ' ~ ';

// 일주일까지만 상대 시각으로 적고 그 뒤는 절대 날짜다(게시 시각은 오래될수록 날짜가 낫다).
const COMMUNITY_MAX_RELATIVE_DAYS = 7;

export interface CommunityBagSnapshotGroup {
  filter: GearFilter;
  gears: CommunityBagSnapshotGear[];
  totalWeight: number;
}

const COMMUNITY_BAG_SNAPSHOT_FILTER_ORDER = (
  Object.keys(GEAR_FILTER_NAMES) as GearFilter[]
).filter(filter => filter !== GearFilter.All);

/**
 * 스냅샷 장비를 앱의 1차 필터 순서에 맞춰 묶는다(CM-4, CM-7).
 *
 * 스냅샷에는 세분 카테고리 키가 저장되므로 `GearCategoryGroups`의 공통 매핑을
 * 사용한다. 매핑에 없는 키는 `getGroupForCategory`가 기타로 귀속한다.
 */
export const getCommunityBagSnapshotGroups = (
  gears: CommunityBagSnapshotGear[]
): CommunityBagSnapshotGroup[] => {
  const groups = new Map<GearFilter, CommunityBagSnapshotGear[]>();

  gears.forEach(gear => {
    const filter = getGroupForCategory(gear.category);
    const group = groups.get(filter) ?? [];
    group.push(gear);
    groups.set(filter, group);
  });

  return COMMUNITY_BAG_SNAPSHOT_FILTER_ORDER.flatMap(filter => {
    const group = groups.get(filter);

    if (!group) {
      return [];
    }

    return [
      {
        filter,
        gears: group,
        totalWeight: group.reduce((total, gear) => total + gear.weight, 0),
      },
    ];
  });
};

export const formatCommunityDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const formatCommunitySnapshotDateRange = (
  startDate?: string,
  endDate?: string
): string => {
  return formatBagSnapshotDateRange(startDate, endDate, {
    dateFormat: SNAPSHOT_DATE_FORMAT,
    separator: SNAPSHOT_DATE_RANGE_SEPARATOR,
  });
};

export const getCommunityRelativeTime = (date: Date): string => {
  return formatBagSnapshotRelativeTime(
    date,
    {
      justNow: 'community.feed.justNow',
      minutesAgo: 'community.feed.minutesAgo',
      hoursAgo: 'community.feed.hoursAgo',
      daysAgo: 'community.feed.daysAgo',
    },
    COMMUNITY_MAX_RELATIVE_DAYS
  );
};
