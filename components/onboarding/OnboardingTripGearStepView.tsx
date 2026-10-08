import { FC, ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SectionList,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgRow,
  AcgType,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import OnboardingTrip, {
  OnboardingTripGearSection,
  REQUIRED_GEAR_GROUPS,
} from '@/model/onboarding/OnboardingTrip';
import OnboardingTripGearMode from '@/model/onboarding/OnboardingTripGearMode';
import OnboardingTripStepTitleView from './OnboardingTripStepTitleView';
import OnboardingTripGearRowView from './OnboardingTripGearRowView';

interface Props {
  trip: OnboardingTrip;
  onOpenSearch: (group: GearFilter) => void;
}

// 3단계 — 어떤 장비를 챙기세요?(OB-6). 창고 상태로 정한 모드에 따라 체크리스트 / 필수 장비 검색.
const OnboardingTripGearStepView: FC<Props> = ({ trip, onOpenSearch }) => {
  const l10n = app.getL10n();
  const mode = trip.getGearMode();
  const subtitle =
    mode === OnboardingTripGearMode.Warehouse
      ? l10n.t('onboarding.gear.subtitleWarehouse')
      : l10n.t('onboarding.gear.subtitleSearch');

  const header = (
    <View>
      <OnboardingTripStepTitleView
        title={l10n.t('onboarding.gear.title')}
        subtitle={mode === null ? '' : subtitle}
      />
      <OnboardingTripGearSummaryView trip={trip} />
    </View>
  );

  if (mode === null) {
    return (
      <View style={styles.content}>
        {header}
        {trip.hasGearError() ? (
          <OnboardingTripGearErrorView trip={trip} />
        ) : (
          <ActivityIndicator style={styles.loading} color={Acg.ink} />
        )}
      </View>
    );
  }

  if (mode === OnboardingTripGearMode.Warehouse) {
    return (
      <SectionList<Gear, OnboardingTripGearSection>
        sections={trip.getGearSections()}
        keyExtractor={gear => gear.getId()}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <AcgSectionHeaderView
              title={section.title}
              subtitle={l10n.t('onboarding.gear.sectionCount', {
                count: section.data.length,
              })}
            />
          </View>
        )}
        renderItem={({ item, index }) => (
          <OnboardingTripGearRowView
            trip={trip}
            gear={item}
            divided={index > 0}
          />
        )}
      />
    );
  }

  const otherGears = trip.getOtherGears();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      <View style={styles.requiredList}>
        {REQUIRED_GEAR_GROUPS.map(group => (
          <OnboardingTripRequiredCategoryView
            key={group}
            trip={trip}
            group={group}
            onOpenSearch={onOpenSearch}
          />
        ))}
      </View>
      {otherGears.length > 0 ? (
        <View style={styles.sectionHeader}>
          <AcgSectionHeaderView title={l10n.t('onboarding.gear.otherTitle')} />
          {otherGears.map((gear, index) => (
            <OnboardingTripGearRowView
              key={gear.getId()}
              trip={trip}
              gear={gear}
              divided={index > 0}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

// 선택 수 · 총 무게 요약(선택 0이면 숨김). 숫자만 콘덴스드.
const OnboardingTripGearSummaryView: FC<{ trip: OnboardingTrip }> = observer(
  ({ trip }) => {
    const count = trip.getSelectedCount();

    if (count === 0) {
      return null;
    }

    return (
      <PretendardText style={styles.summary}>
        {app.getL10n().t('onboarding.gear.summary', { count })}
        <AcgDisplayText style={styles.summaryNumber}>
          {`${trip.getTotalWeightKg()}kg`}
        </AcgDisplayText>
      </PretendardText>
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

interface RequiredCategoryProps {
  trip: OnboardingTrip;
  group: GearFilter;
  onOpenSearch: (group: GearFilter) => void;
}

// 필수 카테고리 행 — 카테고리명 + 담은 장비 요약 + 셰브론. 아래에 담은 장비 체크 행(OB-6).
const OnboardingTripRequiredCategoryView: FC<RequiredCategoryProps> = observer(
  ({ trip, group, onOpenSearch }) => {
    const l10n = app.getL10n();
    const gears = trip.getGearsInGroup(group);
    const category = getGearFilterName(group);
    const status =
      gears.length === 0
        ? l10n.t('onboarding.gear.searchToAdd')
        : gears.length === 1
          ? gears[0].getDisplayName()
          : l10n.t('onboarding.gear.addedSummary', {
              name: gears[0].getDisplayName(),
              count: gears.length - 1,
            });
    let rows: ReactNode = null;

    if (gears.length > 0) {
      rows = gears.map((gear, index) => (
        <OnboardingTripGearRowView
          key={gear.getId()}
          trip={trip}
          gear={gear}
          divided={index > 0}
        />
      ));
    }

    return (
      <View>
        <TouchableOpacity
          style={styles.categoryRow}
          onPress={() => onOpenSearch(group)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('onboarding.gear.categoryAccessibility', {
            category,
            status,
          })}
        >
          <View style={styles.categoryText}>
            <PretendardText weight='medium' style={styles.categoryTitle}>
              {category}
            </PretendardText>
            <PretendardText style={styles.categoryMeta} numberOfLines={1}>
              {status}
            </PretendardText>
          </View>
          <Ionicons name='chevron-forward' size={18} color={Acg.textMuted} />
        </TouchableOpacity>
        {rows}
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
  summary: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    marginTop: -12,
    marginBottom: 16,
  },
  summaryNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  sectionHeader: {
    marginTop: 20,
  },
  requiredList: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    paddingHorizontal: 16,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  categoryText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  categoryTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  categoryMeta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
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
