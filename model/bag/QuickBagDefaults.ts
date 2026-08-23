import dayjs from 'dayjs';
import { Alert } from 'react-native';
import type { ImperativeRouter } from 'expo-router';
import app from '@/model/app/App';

/**
 * `새로 만들기` 즉시 생성의 기본값(BAG-2).
 *
 * 생성 단계에서 이름·기간을 묻지 않는다 — 대부분의 배낭이 "이번 주말에 갈 것"이라
 * 매번 같은 값을 입력하게 된다. 만든 뒤 배낭 상세에서 고친다.
 */

export const QUICK_BAG_NAME = '이번주'; // l10n-ignore: 로컬 기본 배낭 이름 캐논컬 값

// dayjs의 요일 인덱스(0=일 … 6=토).
const SATURDAY = 6;
const SUNDAY = 0;

/**
 * 다가오는 주말 1박(토~일)을 구한다.
 *
 * **오늘이 토요일이면 오늘이 시작일**이고, **오늘이 일요일이면 다음 주 토요일**을 쓴다 —
 * 이번 주 토요일은 이미 지났으므로, 그대로 쓰면 과거 날짜로 배낭이 만들어진다.
 */
export const getUpcomingWeekend = (
  today: dayjs.Dayjs = dayjs()
): { startDate: dayjs.Dayjs; endDate: dayjs.Dayjs } => {
  const weekday = today.day();
  // 일요일은 이번 주 토요일이 지났으므로 6일 뒤(다음 주 토요일)로 넘긴다.
  const daysUntilSaturday =
    weekday === SUNDAY ? SATURDAY : (SATURDAY - weekday + 7) % 7;
  const startDate = today.add(daysUntilSaturday, 'day').startOf('day');

  return { startDate, endDate: startDate.add(1, 'day') };
};

/**
 * `새로 만들기` 즉시 생성(BAG-2).
 *
 * 이름·기간을 묻지 않고 바로 만들고 **배낭 상세로 이동**한다. 예전에는 생성 직후 장비 편집
 * 화면까지 겹쳐 열었는데, 방금 만든 배낭을 확인할 틈이 없고 장비를 바로 담지 않을 때도
 * 화면을 한 번 닫아야 했다.
 */
export const createQuickBag = async (router: ImperativeRouter) => {
  const bagStore = app.getBagStore();

  if (!bagStore) {
    return;
  }

  const { startDate, endDate } = getUpcomingWeekend();

  try {
    const bagID = await bagStore.add(QUICK_BAG_NAME, startDate, endDate);

    if (!bagID) {
      return;
    }

    app.getAnalyticsManager()?.logClick('bag_create_confirm');
    router.push(`/bag/${bagID}`);
  } catch (error) {
  console.error('배낭 추가 중 오류 발생:', error); // l10n-ignore: 개발자 로그
  Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('bag.addFailed'));
  }
};
