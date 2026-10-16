import app from '@/model/app/App';
import { getBlockMenuText } from '@/model/block/UserBlockFlow';

interface Params {
  authorName: string;
  onReport: () => void;
  onBlock: () => void;
}

// 남이 쓴 콘텐츠의 `⋯` 메뉴(CM-10·CM-17): `신고` 다음 `{닉네임} 차단`. 차단도 파괴적 색을 쓰지 않는다.
const getModerationMenuItems = ({ authorName, onReport, onBlock }: Params) => [
  {
    icon: 'flag-outline' as const,
    text: app.getL10n().t('moderation.report'),
    onPress: onReport,
  },
  {
    icon: 'ban-outline' as const,
    text: getBlockMenuText(authorName),
    onPress: onBlock,
  },
];

export default getModerationMenuItems;
