import { FC } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import DateRangeCalendarView from '@/components/bag/DateRangeCalendarView';
import { AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';
import OnboardingTripStepTitleView from './OnboardingTripStepTitleView';

interface Props {
  trip: OnboardingTrip;
}

// 1단계 — 언제 가세요?(OB-4). 기존 범위 캘린더를 펼친 채로 쓴다.
const OnboardingTripDateStepView: FC<Props> = ({ trip }) => {
  const l10n = app.getL10n();

  const handleStartDateChange = (date: dayjs.Dayjs) => {
    trip.setStartDate(date);
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    trip.setEndDate(date);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingTripStepTitleView
        title={l10n.t('onboarding.date.title')}
        subtitle={l10n.t('onboarding.date.subtitle')}
      />
      <DateRangeCalendarView
        startDate={trip.getStartDate()}
        endDate={trip.getEndDate()}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        alwaysOpen
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    paddingBottom: 24,
  },
});

export default observer(OnboardingTripDateStepView);
