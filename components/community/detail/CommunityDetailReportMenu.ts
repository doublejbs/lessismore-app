import CommunityDetail, { CommunityReportTarget } from '@/model/community-detail/CommunityDetail';
import CommunityReportReason from '@/model/community/CommunityReportReason';
import app from '@/model/app/App';

export interface CommunityReportSheetTarget {
  target: CommunityReportTarget;
}

const getCommunityReportMenuItems = (
  target: CommunityReportSheetTarget | null,
  detail: CommunityDetail,
  close: () => void
) => {
  if (!target) {
    return [];
  }

  const reasons: [CommunityReportReason, string][] = [
    [CommunityReportReason.Spam, 'spam'],
    [CommunityReportReason.Harassment, 'harassment'],
    [CommunityReportReason.SexualViolence, 'sexualViolence'],
    [CommunityReportReason.Copyright, 'copyright'],
    [CommunityReportReason.Privacy, 'privacy'],
    [CommunityReportReason.Other, 'other'],
  ];

  return reasons.map(([reason, key]) => ({
    icon: 'flag-outline' as const,
    text: app.getL10n().t(`community.report.${key}`),
    onPress: () => {
      close();
      setTimeout(() => void detail.report(target.target, reason), 0);
    },
  }));
};

export default getCommunityReportMenuItems;
