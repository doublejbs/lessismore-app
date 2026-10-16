import { FC } from 'react';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import CommunityReportReason from '@/model/community/CommunityReportReason';
import app from '@/model/app/App';
import getReportReasonMenuItems from './ReportReasonMenuItems';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (reason: CommunityReportReason) => void;
}

// 신고 사유 시트(CM-10) — 장비·배낭 댓글과 박지 이용자 후기의 `⋯` → `신고`에서 뜬다.
const ReportReasonSheetView: FC<Props> = ({ visible, onClose, onSelect }) => {
  return (
    <BottomMenuModalView
      visible={visible}
      onClose={onClose}
      title={app.getL10n().t('community.report.title')}
      menuItems={getReportReasonMenuItems(onSelect)}
    />
  );
};

export default ReportReasonSheetView;
