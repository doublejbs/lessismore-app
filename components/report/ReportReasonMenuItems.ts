import CommunityReportReason from '@/model/community/CommunityReportReason';
import app from '@/model/app/App';

// 신고 사유 시트 항목(CM-10). 커뮤니티 게시글·댓글, 장비·배낭 댓글, 박지 이용자 후기가 같은 목록을 쓴다.
// `blocked`는 사용자 차단 알림 전용이라 고를 수 없다(CM-17).
const REPORT_REASONS: readonly [CommunityReportReason, string][] = [
  [CommunityReportReason.Spam, 'spam'],
  [CommunityReportReason.Harassment, 'harassment'],
  [CommunityReportReason.SexualViolence, 'sexualViolence'],
  [CommunityReportReason.Copyright, 'copyright'],
  [CommunityReportReason.Privacy, 'privacy'],
  [CommunityReportReason.Other, 'other'],
];

const getReportReasonMenuItems = (
  onSelect: (reason: CommunityReportReason) => void
) => {
  return REPORT_REASONS.map(([reason, key]) => ({
    icon: 'flag-outline' as const,
    text: app.getL10n().t(`community.report.${key}`),
    onPress: () => onSelect(reason),
  }));
};

export default getReportReasonMenuItems;
