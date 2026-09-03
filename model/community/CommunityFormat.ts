import app from '@/model/app/App';
import { getGroupForCategory } from '@/model/gear/GearCategoryGroups';
import GearFilter from '@/model/gear/GearFilter';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';
import CommunityPostType from './CommunityPostType';
import { CommunityBagSnapshotGear } from './CommunityData';
import {
  COMMUNITY_DAY_IN_MILLISECONDS,
  COMMUNITY_HOUR_IN_MILLISECONDS,
  COMMUNITY_MINUTE_IN_MILLISECONDS,
} from './CommunityLimits';

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

export const getCommunityTypeLabel = (type: CommunityPostType): string => {
  const key =
    type === CommunityPostType.Post
      ? 'post'
      : type === CommunityPostType.BagReview
        ? 'bagReview'
        : 'poll';

  return app.getL10n().t(`community.type.${key}`);
};

export const formatCommunityDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const formatCommunityWeight = (grams: number): string => {
  return (grams / 1000).toFixed(1);
};

export const getCommunityRelativeTime = (date: Date): string => {
  const elapsed = Math.max(0, Date.now() - date.getTime());

  if (elapsed < COMMUNITY_MINUTE_IN_MILLISECONDS) {
    return app.getL10n().t('community.feed.justNow');
  }

  if (elapsed < COMMUNITY_HOUR_IN_MILLISECONDS) {
    return app.getL10n().t('community.feed.minutesAgo', {
      count: Math.floor(elapsed / COMMUNITY_MINUTE_IN_MILLISECONDS),
    });
  }

  if (elapsed < COMMUNITY_DAY_IN_MILLISECONDS) {
    return app.getL10n().t('community.feed.hoursAgo', {
      count: Math.floor(elapsed / COMMUNITY_HOUR_IN_MILLISECONDS),
    });
  }

  if (elapsed < 7 * COMMUNITY_DAY_IN_MILLISECONDS) {
    return app.getL10n().t('community.feed.daysAgo', {
      count: Math.floor(elapsed / COMMUNITY_DAY_IN_MILLISECONDS),
    });
  }

  return formatCommunityDate(date).replace(/-/g, '.');
};
