import app from '@/model/app/App';
import { CommunityReportInput } from '@/model/community/CommunityData';

/**
 * 신고 사유 시트를 열기 전 로그인 확인(CM-10) — 커뮤니티처럼 비로그인이면 시트 대신 로그인 모달을 연다.
 */
export const requireReportLogin = () => {
  if (app.getFirebase().isLoggedIn()) {
    return true;
  }

  app.getLogInAlertManager()?.show();

  return false;
};

/**
 * 장비·배낭 댓글과 박지 이용자 후기 신고(CM-10). 커뮤니티 신고와 같은 `community-reports`에 같은
 * 규칙(결정적 문서 ID, 중복이면 새로 만들지 않음)으로 저장하고 같은 토스트를 띄운다.
 */
export const reportContent = async (input: CommunityReportInput) => {
  const l10n = app.getL10n();

  if (!requireReportLogin()) {
    return;
  }

  try {
    await app.getCommunityStore()!.report(input);
    app.getToastManager()?.show({ message: l10n.t('community.report.done') });
    app.getAnalyticsManager()?.logClick('community_report', {
      target: input.targetType,
    });
  } catch {
    app.getToastManager()?.show({ message: l10n.t('community.report.failed') });
  }
};
