import app from '@/model/app/App';
import { BagPointEntry } from '@/model/bag-point/BagPointEntry';
import {
  getPointShortDateText,
  getPointTypeLabel,
} from '@/model/point/PointLabels';

/**
 * 배낭 포인트의 메타 한 줄 (BD-14) — `유형 · 10.09`. 작성자는 없다(내 것이다).
 * 연결 그룹에서 온 읽기 전용 포인트면 출처(`그룹 {이름}`)를 유형 뒤에 끼운다 — 코스 목록의
 * 출처 조각(`bag.route.fromGroup`)과 같은 문구·같은 자리다(배지 대신 메타 조각, HM-8).
 * 지도 카드와 목록 행이 같은 줄을 쓴다.
 */
export const getBagPointMeta = (entry: BagPointEntry): string => {
  const l10n = app.getL10n();

  return [
    getPointTypeLabel(entry.point.getType()),
    ...(entry.groupName
      ? [l10n.t('bag.route.fromGroup', { name: entry.groupName })]
      : []),
    getPointShortDateText(entry.point.getCreatedAt()),
  ].join(l10n.t('common.metaSeparator'));
};
