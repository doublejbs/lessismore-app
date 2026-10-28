import CommunityDetail, { CommunityReportTarget } from '@/model/community-detail/CommunityDetail';
import getReportReasonMenuItems from '@/components/report/ReportReasonMenuItems';

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

  return getReportReasonMenuItems(reason => {
    close();
    setTimeout(() => void detail.report(target.target, reason), 0);
  });
};

export default getCommunityReportMenuItems;
