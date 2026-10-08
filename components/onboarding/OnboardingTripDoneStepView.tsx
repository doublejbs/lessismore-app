import { FC } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import GearView from '@/components/warehouse/GearView';
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

// 요약 면에 보여 줄 장비 행 수 — 넘으면 `외 {n}개`(OB-7).
const MAX_GEAR_ROWS = 6;

// 4단계 — 완료(OB-7). 만들 여행의 요약(이름 + `무게 · 기간 · 여행지` + 담은 장비)과 알림 안내.
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
  const selectedGears = trip.getSelectedGears();
  const visibleGears = selectedGears.slice(0, MAX_GEAR_ROWS);
  const hiddenCount = selectedGears.length - visibleGears.length;

  // 3단계에서 고른 장비(OB-7, 2026-10-08 디자인 리뷰) — 창고 행 문법 그대로, 보기 전용.
  const renderGears = () => {
    if (selectedGears.length === 0) {
      return (
        <PretendardText style={styles.gearEmpty}>
          {l10n.t('onboarding.done.noGear')}
        </PretendardText>
      );
    }

    return (
      <>
        <PretendardText style={styles.gearTitle}>
          {l10n.t('onboarding.done.gearListTitle', {
            count: selectedGears.length,
          })}
        </PretendardText>
        {visibleGears.map((gear, index) => (
          <GearView key={gear.getId()} gear={gear} divided={index > 0} />
        ))}
        {hiddenCount > 0 ? (
          <PretendardText style={styles.gearMore}>
            {l10n.t('onboarding.done.gearMore', { count: hiddenCount })}
          </PretendardText>
        ) : null}
      </>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingTripStepTitleView
        title={l10n.t('onboarding.done.title')}
        subtitle={l10n.t('onboarding.done.renameHint')}
      />
      <View style={styles.surface}>
        <View
          style={styles.summary}
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
        <View style={styles.gears}>{renderGears()}</View>
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
    paddingHorizontal: 16,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  summary: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    justifyContent: 'center',
    gap: 2,
  },
  // 요약과 장비 목록을 헤어라인으로 가른다(HM-8 — 면 안에 면을 두지 않는다).
  gears: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    paddingTop: 12,
    paddingBottom: 4,
  },
  gearTitle: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  gearMore: {
    ...AcgType.meta,
    color: Acg.textMuted,
    paddingTop: 4,
    paddingBottom: 10,
  },
  gearEmpty: {
    ...AcgType.meta,
    color: Acg.textMuted,
    paddingBottom: 10,
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
