import dayjs from 'dayjs';
import app from '@/model/app/App';
import NotificationPermissionStatus from '@/model/notification/NotificationPermissionStatus';
import NotificationType from '@/model/notification/NotificationType';

// NT-13: 체험 종료 리마인더는 이 식별자 하나로 예약·취소한다 — 다시 예약하면 OS가 같은 식별자를 덮어쓴다.
export const TRIAL_REMINDER_IDENTIFIER = 'subscription-trial-reminder';

// SUB-10: 무료 체험 길이(일). 스토어 도입 오퍼(무료 체험 1주)와 같은 값이다.
const TRIAL_LENGTH_DAYS = 7;

// 체험 시작일을 1일째로 셀 때 5일째 = 시작일 + 4일.
const TRIAL_REMINDER_DAY_OFFSET = 4;

const TRIAL_REMINDER_HOUR = 9;

const TRIAL_REMINDER_ROUTE = '/subscription';

/**
 * SUB-10 체험 종료 알림 시각 — 체험 시작일 기준 5일째 오전 9시.
 *
 * 시작일은 체험 종료일에서 7일을 뺀 값으로 잡는다. 구매 직후에는 "지금"과 같은 날이고, 앱을 다시 켜서
 * 권한을 다시 받아도 시각이 밀리지 않는다.
 */
export const getTrialReminderDate = (trialEndsAt: Date): Date => {
  return dayjs(trialEndsAt)
    .subtract(TRIAL_LENGTH_DAYS, 'day')
    .startOf('day')
    .add(TRIAL_REMINDER_DAY_OFFSET, 'day')
    .hour(TRIAL_REMINDER_HOUR)
    .toDate();
};

/**
 * SUB-10·NT-13: 체험 종료 로컬 알림 1건을 예약한다.
 *
 * - 알림 권한이 없으면 예약하지 않는다(권한을 묻지도 않는다 — 구독 화면에서 권한을 묻지 않는다).
 * - 예약 시각이 이미 지났거나 체험 종료 뒤면 예약하지 않는다(과거 시각은 `scheduleLocal`도 거른다).
 * - 탭하면 구독 화면(`/subscription`). `type`은 NT-10 `notification_open` 지표 값이다.
 */
export const scheduleTrialReminder = async (
  trialEndsAt: Date,
  priceString: string | null
): Promise<void> => {
  const notificationManager = app.getNotificationManager();

  if (!notificationManager || !Number.isFinite(trialEndsAt.getTime())) {
    return;
  }

  const reminderAt = getTrialReminderDate(trialEndsAt);

  if (reminderAt.getTime() <= Date.now() || reminderAt >= trialEndsAt) {
    return;
  }

  const permission = await notificationManager.getPermissionStatus();

  if (permission !== NotificationPermissionStatus.Granted) {
    return;
  }

  const l10n = app.getL10n();
  const date = dayjs(trialEndsAt).format(l10n.t('subscription.dateFormat'));
  const body = priceString
    ? l10n.t('subscription.trialReminderBody', { date, price: priceString })
    : l10n.t('subscription.trialReminderBodyNoPrice', { date });

  await notificationManager.scheduleLocal(
    TRIAL_REMINDER_IDENTIFIER,
    l10n.t('subscription.trialReminderTitle'),
    body,
    reminderAt,
    { route: TRIAL_REMINDER_ROUTE, type: NotificationType.TrialReminder }
  );
};

// SUB-10: 체험이 유료로 바뀌었거나 권한이 사라졌을 때(만료·환불·체험 중 해지) 예약을 지운다.
export const cancelTrialReminder = async (): Promise<void> => {
  await app.getNotificationManager()?.cancelLocal(TRIAL_REMINDER_IDENTIFIER);
};
