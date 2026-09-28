import app from '@/model/app/App';
import {
  formatBagSnapshotDateRange,
  formatBagSnapshotRelativeTime,
} from '@/model/bag-snapshot/BagSnapshotFormat';

/**
 * 그룹 기간 표기 (GRP-1·GRP-4).
 *
 * 형식은 **배낭과 같은 단일 소스**(`bag.dateShortFormat`·`bag.dateRangeSeparator`)를 쓴다 —
 * 그룹 목록·초대 수락·상세 헤더·멤버 배낭 카드가 같은 그룹의 같은 날짜를 그리므로
 * 화면마다 형식이 갈리면 영어·일본어에서 같은 여행이 다른 날짜처럼 읽힌다.
 * 하루짜리 여행(시작일 = 종료일)은 한 번만 적는다.
 */
export const formatGroupDateRange = (
  startDate: string,
  endDate: string
): string => {
  const l10n = app.getL10n();

  return formatBagSnapshotDateRange(startDate, endDate, {
    dateFormat: l10n.t('bag.dateShortFormat'),
    separator: l10n.t('bag.dateRangeSeparator'),
  });
};

/**
 * 스냅샷 신선도 문구 (GRP-5). 스냅샷은 실시간 구독이 아니라 쓰기 시점 동기화라
 * "언제 기준 값인지"를 밝혀야 일행이 낡은 구성을 최신으로 오해하지 않는다.
 * 며칠이 지나도 절대 날짜로 바꾸지 않는다 — 여기서는 "얼마나 낡았는지"가 정보다.
 */
export const getGroupSyncedAtText = (date: Date): string => {
  return formatBagSnapshotRelativeTime(date, {
    justNow: 'group.member.syncedJustNow',
    minutesAgo: 'group.member.syncedMinutesAgo',
    hoursAgo: 'group.member.syncedHoursAgo',
    daysAgo: 'group.member.syncedDaysAgo',
  });
};
