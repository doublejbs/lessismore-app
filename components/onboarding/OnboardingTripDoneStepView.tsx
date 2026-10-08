import { FC } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgRow,
  AcgType,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';
import OnboardingTripStepTitleView from './OnboardingTripStepTitleView';

interface Props {
  trip: OnboardingTrip;
}

// 4단계 — 완료(OB-7). 만들 여행의 요약(이름 + `무게 · 기간 · 여행지`)과 알림 안내.
const OnboardingTripDoneStepView: FC<Props> = ({ trip }) => {
  const l10n = app.getL10n();
  const location = trip.getLocation();
  const separator = l10n.t('common.metaSeparator');
  const metaParts = [trip.getDisplayDates(), location?.name ?? ''].filter(
    Boolean
  );
  const reminder = trip.isDatesUndecided()
    ? l10n.t('onboarding.done.reminderUndecided')
    : l10n.t('onboarding.done.reminder');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingTripStepTitleView
        title={l10n.t('onboarding.done.title')}
        subtitle={l10n.t('onboarding.done.renameHint')}
      />
      <View
        style={styles.surface}
        accessible
        accessibilityLabel={[
          trip.getTripName(),
          `${trip.getTotalWeightKg()}kg`,
          ...metaParts,
        ].join(', ')}
      >
        <PretendardText weight='medium' style={styles.name} numberOfLines={2}>
          {trip.getTripName()}
        </PretendardText>
        {/* 숫자를 맨 앞에 두고 값을 ` · `로 잇는다(HM-8). 무게 숫자만 콘덴스드. */}
        <PretendardText style={styles.meta} numberOfLines={2}>
          <AcgDisplayText style={styles.metaNumber}>
            {`${trip.getTotalWeightKg()}kg`}
          </AcgDisplayText>
          {metaParts.map(part => `${separator}${part}`).join('')}
        </PretendardText>
      </View>
      <View style={styles.reminder}>
        <Ionicons name='notifications-outline' size={20} color={Acg.ink} />
        <PretendardText style={styles.reminderText}>{reminder}</PretendardText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    paddingBottom: 24,
  },
  surface: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    paddingHorizontal: 16,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    gap: 2,
  },
  name: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
  },
  reminderText: {
    ...AcgType.body,
    color: Acg.ink,
    flex: 1,
  },
});

export default observer(OnboardingTripDoneStepView);
