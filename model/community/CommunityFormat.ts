import app from '@/model/app/App';
import CommunityPostType from './CommunityPostType';
import {
  COMMUNITY_DAY_IN_MILLISECONDS,
  COMMUNITY_HOUR_IN_MILLISECONDS,
  COMMUNITY_MINUTE_IN_MILLISECONDS,
} from './CommunityLimits';

export const getCommunityTypeLabel = (type: CommunityPostType): string => {
  const key =
    type === CommunityPostType.Question
      ? 'question'
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
