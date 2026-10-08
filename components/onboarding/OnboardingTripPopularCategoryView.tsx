import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import SearchRankSkeletonView from '@/components/search/SearchRankSkeletonView';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import OnboardingTrip, {
  POPULAR_GEAR_COUNT,
} from '@/model/onboarding/OnboardingTrip';
import OnboardingTripGearSource from '@/model/onboarding/OnboardingTripGearSource';
import OnboardingTripGearRowView from './OnboardingTripGearRowView';

interface Props {
  trip: OnboardingTrip;
  group: GearFilter;
  // 창고가 비어 있는 모드 — 섹션 머리를 크게 두고, 검색·직접 추가로 담은 창고 장비를 이 아래에 보인다.
  // 체크리스트 모드에서는 창고 장비가 위 체크리스트에 이미 있으므로 반복하지 않는다.
  standalone: boolean;
  onOpenSearch: (group: GearFilter) => void;
  onOpenCustomAdd: (group: GearFilter) => void;
}

const ACTION_MIN_HEIGHT = 44;

/**
 * 3단계 인기 구획의 카테고리 하나(OB-6): 머리 → (창고 장비) → 인기 장비 상위 5개 → 보조 액션 둘.
 * 로딩 중에는 같은 높이의 스켈레톤 5행, 실패·빈 결과면 인기 행만 조용히 숨긴다.
 */
const OnboardingTripPopularCategoryView: FC<Props> = ({
  trip,
  group,
  standalone,
  onOpenSearch,
  onOpenCustomAdd,
}) => {
  const l10n = app.getL10n();
  const category = getGearFilterName(group);
  const warehouseGears = standalone ? trip.getGearsInGroup(group) : [];
  const popularGears = trip.getPopularGears(group);
  const findLabel = l10n.t('onboarding.gear.findMore', { category });
  const customLabel = l10n.t('onboarding.gear.customAdd');

  const handleOpenSearch = () => {
    onOpenSearch(group);
  };

  const handleOpenCustomAdd = () => {
    onOpenCustomAdd(group);
  };

  let popularRows = null;

  if (trip.isPopularLoading()) {
    popularRows = (
      <SearchRankSkeletonView count={POPULAR_GEAR_COUNT} showRank={false} />
    );
  } else if (popularGears.length > 0) {
    popularRows = popularGears.map((gear, index) => (
      <OnboardingTripGearRowView
        key={gear.getId()}
        trip={trip}
        gear={gear}
        divided={index > 0 || warehouseGears.length > 0}
        source={OnboardingTripGearSource.Popular}
      />
    ));
  }

  return (
    <View style={styles.container}>
      {standalone ? (
        <AcgSectionHeaderView title={category} />
      ) : (
        <PretendardText
          weight='semibold'
          style={styles.label}
          accessibilityRole='header'
        >
          {category}
        </PretendardText>
      )}
      {warehouseGears.map((gear, index) => (
        <OnboardingTripGearRowView
          key={gear.getId()}
          trip={trip}
          gear={gear}
          divided={index > 0}
          source={OnboardingTripGearSource.Warehouse}
        />
      ))}
      {popularRows}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.action}
          onPress={handleOpenSearch}
          activeOpacity={0.85}
          accessibilityRole='button'
          accessibilityLabel={findLabel}
        >
          <PretendardText
            weight='semibold'
            style={styles.actionLabel}
            numberOfLines={1}
          >
            {findLabel}
          </PretendardText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={handleOpenCustomAdd}
          activeOpacity={0.85}
          accessibilityRole='button'
          accessibilityLabel={customLabel}
        >
          <PretendardText
            weight='semibold'
            style={styles.actionLabel}
            numberOfLines={1}
          >
            {customLabel}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  // 체크리스트 모드의 카테고리 라벨 — `인기 장비에서 담기` 섹션 머리 아래 한 단 작은 머리.
  label: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  // 보조 액션 알약 — 흰 면 + 잉크 테두리(SR-11 보조 버튼과 같은 값). 라임은 하단 `다음` 하나뿐(HM-8).
  // Dynamic Type 대응으로 고정 높이 대신 최소 높이 + 세로 패딩.
  action: {
    minHeight: ACTION_MIN_HEIGHT,
    borderRadius: ACTION_MIN_HEIGHT,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.ink,
  },
  actionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(OnboardingTripPopularCategoryView);
