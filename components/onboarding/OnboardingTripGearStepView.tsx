import { FC } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GearFilter from '@/model/gear/GearFilter';
import OnboardingTrip, {
  REQUIRED_GEAR_GROUPS,
} from '@/model/onboarding/OnboardingTrip';
import OnboardingTripGearMode from '@/model/onboarding/OnboardingTripGearMode';
import OnboardingTripGearSource from '@/model/onboarding/OnboardingTripGearSource';
import OnboardingTripStepTitleView from './OnboardingTripStepTitleView';
import OnboardingTripGearRowView from './OnboardingTripGearRowView';
import OnboardingTripPopularCategoryView from './OnboardingTripPopularCategoryView';

interface Props {
  trip: OnboardingTrip;
  onOpenSearch: (group: GearFilter) => void;
  onOpenCustomAdd: (group: GearFilter) => void;
}

// 요약 줄이 ScrollView 자식 중 몇 번째인지 — 스크롤해도 위에 붙는다(OB-6 sticky).
const SUMMARY_INDEX = 1;

// 3단계 — 어떤 장비를 챙기세요?(OB-6). 창고가 있으면 체크리스트 + 인기 구획, 비어 있으면 인기 구획만.
const OnboardingTripGearStepView: FC<Props> = ({
  trip,
  onOpenSearch,
  onOpenCustomAdd,
}) => {
  const l10n = app.getL10n();
  const mode = trip.getGearMode();
  let subtitle = '';

  if (mode === OnboardingTripGearMode.Warehouse) {
    subtitle = l10n.t('onboarding.gear.subtitleWarehouse');
  } else if (mode === OnboardingTripGearMode.Popular) {
    subtitle = l10n.t('onboarding.gear.subtitlePopular');
  }

  const renderPopularSection = (standalone: boolean) =>
    REQUIRED_GEAR_GROUPS.map(group => (
      <OnboardingTripPopularCategoryView
        key={group}
        trip={trip}
        group={group}
        standalone={standalone}
        onOpenSearch={onOpenSearch}
        onOpenCustomAdd={onOpenCustomAdd}
      />
    ));

  const renderBody = () => {
    if (mode === null) {
      return trip.hasGearError() ? (
        <OnboardingTripGearErrorView trip={trip} />
      ) : (
        <ActivityIndicator style={styles.loading} color={Acg.ink} />
      );
    }

    if (mode === OnboardingTripGearMode.Warehouse) {
      return (
        <View>
          {trip.getGearSections().map((section, sectionIndex) => (
            <View
              key={section.group}
              style={sectionIndex > 0 ? styles.section : undefined}
            >
              <AcgSectionHeaderView
                title={section.title}
                subtitle={l10n.t('onboarding.gear.sectionCount', {
                  count: section.data.length,
                })}
              />
              {section.data.map((gear, index) => (
                <OnboardingTripGearRowView
                  key={gear.getId()}
                  trip={trip}
                  gear={gear}
                  divided={index > 0}
                  source={OnboardingTripGearSource.Warehouse}
                />
              ))}
            </View>
          ))}
          <View style={styles.popularSection}>
            <AcgSectionHeaderView
              title={l10n.t('onboarding.gear.popularTitle')}
            />
            {renderPopularSection(false)}
          </View>
        </View>
      );
    }

    const otherGears = trip.getOtherGears();

    return (
      <View>
        {renderPopularSection(true)}
        {otherGears.length > 0 ? (
          <View style={styles.popularSection}>
            <AcgSectionHeaderView
              title={l10n.t('onboarding.gear.otherTitle')}
            />
            {otherGears.map((gear, index) => (
              <OnboardingTripGearRowView
                key={gear.getId()}
                trip={trip}
                gear={gear}
                divided={index > 0}
                source={OnboardingTripGearSource.Warehouse}
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[SUMMARY_INDEX]}
    >
      <OnboardingTripStepTitleView
        title={l10n.t('onboarding.gear.title')}
        subtitle={subtitle}
      />
      <OnboardingTripGearSummaryView trip={trip} />
      {renderBody()}
    </ScrollView>
  );
};

// 담은 수 · 총 무게 요약(OB-6). 0개여도 자리를 지켜 담는 순간 목록이 밀리지 않는다. 숫자만 콘덴스드.
const OnboardingTripGearSummaryView: FC<{ trip: OnboardingTrip }> = observer(
  ({ trip }) => {
    const count = trip.getSelectedCount();

    return (
      <View style={styles.summaryBar} accessibilityLiveRegion='polite'>
        <PretendardText style={styles.summary}>
          {app.getL10n().t('onboarding.gear.summary', { count })}
          <AcgDisplayText style={styles.summaryNumber}>
            {`${trip.getTotalWeightKg()}kg`}
          </AcgDisplayText>
        </PretendardText>
      </View>
    );
  }
);

const OnboardingTripGearErrorView: FC<{ trip: OnboardingTrip }> = observer(
  ({ trip }) => {
    const l10n = app.getL10n();

    return (
      <View style={styles.error}>
        <PretendardText style={styles.errorText}>
          {l10n.t('onboarding.gear.loadFailed')}
        </PretendardText>
        <TouchableOpacity
          style={styles.retry}
          onPress={() => {
            void trip.loadGears();
          }}
          disabled={trip.isGearLoading()}
          accessibilityRole='button'
        >
          <PretendardText weight='semibold' style={styles.retryLabel}>
            {l10n.t('common.retry')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    paddingBottom: 24,
  },
  loading: {
    marginTop: 24,
  },
  // 스크롤해도 위에 붙는 요약 줄 — 순백 면이라 아래 목록이 그 밑으로 지나간다. 좌우를 화면 끝까지
  // 펴고 아래 헤어라인으로 목록과 가른다(그림자 없음, HM-8).
  summaryBar: {
    marginHorizontal: -AcgLayout.screenPadding,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingVertical: 10,
    // 제목 묶음의 아래 여백(24)을 줄여 부제와 붙여 읽히게 한다.
    marginTop: -12,
    marginBottom: 16,
    backgroundColor: Acg.paper,
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
  },
  summary: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  summaryNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  section: {
    marginTop: 20,
  },
  popularSection: {
    marginTop: 32,
  },
  error: {
    gap: 12,
    alignItems: 'flex-start',
  },
  errorText: {
    ...AcgType.body,
    color: Acg.ink,
  },
  retry: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  retryLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(OnboardingTripGearStepView);
