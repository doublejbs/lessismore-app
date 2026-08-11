import dayjs, { Dayjs } from 'dayjs';

/**
 * 홈의 날짜 표기(HM-1·HM-7 시각 문법). **전부 순수 함수다** — 기준 날짜(`today`)를 인자로
 * 받아 테스트에서 시각을 고정할 수 있게 한다(`HomeTripPlan`과 같은 규칙).
 *
 * dayjs 한국어 로케일은 등록하지 않는다 — 전역에 걸면 앱의 다른 날짜 표기까지 함께 바뀌므로
 * 요일만 배열로 매핑한다(날씨 WT·여행지 DST 화면과 같은 방식).
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 홈 헤더의 오늘 날짜 → `8월 11일 화요일`. 영문 요일과 한글 날짜를 섞지 않는다. */
export const formatHeaderDate = (date: Dayjs): string =>
  `${date.format('M월 D일')} ${WEEKDAYS[date.day()]}요일`;

/** 기간 한쪽 → `8.15 토` (연도가 필요하면 `2027.1.2 토`). */
const formatTripDay = (date: Dayjs, withYear: boolean): string =>
  `${withYear ? date.format('YYYY.') : ''}${date.format('M.D')} ${
    WEEKDAYS[date.day()]
  }`;

/**
 * 히어로 카드의 여행 기간 → `8.15 토 ~ 8.16 일`.
 *
 * **연도는 해가 바뀌는 여행에서만 붙인다**(2026-08-11 디자인 리뷰). 1박 여행에 `2026.08.15 ~
 * 2026.08.16`처럼 같은 연도를 두 번 쓸 이유가 없고, 그 길이 때문에 날짜 알약이 카드 폭을 다
 * 먹었다. 대신 요일을 넣는다 — 주말인지가 이 자리에서 알고 싶은 것이다.
 *
 * 반환값에 한글 요일이 섞이므로 호출부는 **콘덴스드(Archivo Narrow)를 쓸 수 없다**
 * (한글 글리프가 없어 글자가 깨진다).
 */
export const formatTripPeriod = (
  startValue: number | null,
  endValue: number | null,
  today: Dayjs
): string | null => {
  if (startValue === null) {
    return null;
  }

  const start = dayjs(startValue);
  const end = endValue === null ? start : dayjs(endValue);
  // 올해가 아닌 여행이면 시작 쪽에, 연말연시를 넘기는 여행이면 양쪽에 연도를 붙인다.
  const crossesYear = start.year() !== end.year();
  const isOtherYear = start.year() !== today.year();

  if (start.isSame(end, 'day')) {
    return formatTripDay(start, isOtherYear);
  }

  return `${formatTripDay(start, crossesYear || isOtherYear)} ~ ${formatTripDay(
    end,
    crossesYear
  )}`;
};
