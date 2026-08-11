import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import LiquidChip from '@/components/liquid/LiquidChip';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
  LiquidMotion,
} from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import { formatGearWeightOrNull } from '@/model/gear/WeightFormat';
import {
  getCategoryChips,
  getPreviewGears,
} from '@/model/home/HomeWarehousePreview';
import app from '@/model/app/App';

interface Props {
  gears: Gear[];
}

/**
 * HM-4 창고 미리보기 (Liquid Depth).
 *
 * 총 개수·총 무게 같은 집계는 두지 않는다 — 홈에서 알고 싶은 건 "몇 개 있나"가 아니라
 * "뭐가 있나"다. 대신 대분류 칩으로 좁혀 보고, 더 보려면 `전체 보기`로 창고에 들어간다.
 *
 * 칩 선택은 **이 컴포넌트의 로컬 상태**다. 창고 화면의 `FilterManager`를 건드리면
 * 홈에서 훑어본 게 창고 화면 상태까지 바꿔 버린다 — 훑기와 작업은 분리한다.
 */
const HomeWarehousePreviewView: FC<Props> = ({ gears }) => {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<GearFilter>(
    GearFilter.All
  );

  const chips = getCategoryChips(gears);
  const previewGears = getPreviewGears(gears, selectedFilter);

  const handleSelectFilter = (filter: GearFilter) => {
    setSelectedFilter(filter);
    app.getAnalyticsManager()?.logClick('home_warehouse_filter', {
      category: filter,
    });
  };

  const handleOpenWarehouse = () => {
    app.getAnalyticsManager()?.logClick('home_warehouse_more');
    // 홈에서 좁힌 카테고리를 그대로 넘긴다 — 들어가서 다시 고르게 하지 않는다.
    router.push(`/warehouse?category=${selectedFilter}`);
  };

  const handleOpenGear = (gear: Gear) => {
    router.push(`/gear-detail/${gear.getId()}`);
  };

  const handleAddGear = () => {
    router.push('/gear-add-options');
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <PretendardText weight='bold' style={styles.sectionTitle}>
          내 창고
        </PretendardText>
        <PretendardText weight='semibold' style={styles.sectionCount}>
          {`${gears.length}개`}
        </PretendardText>
      </View>

      {gears.length === 0 ? (
        <View style={styles.emptyCard}>
          <PretendardText weight='bold' style={styles.emptyTitle}>
            창고가 비어 있어요
          </PretendardText>
          <PretendardText style={styles.emptySubtitle}>
            가진 장비를 하나씩 담아보세요
          </PretendardText>
          <LiquidPillButton
            label='첫 장비 담기'
            block
            onPress={handleAddGear}
            style={styles.emptyCta}
          />
        </View>
      ) : (
        <>
          {/* 칩 줄은 화면 좌우로 블리드시킨다 — 스크롤이 가장자리에서 끊기지 않게. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}
          >
            {chips.map(chip => (
              <LiquidChip
                key={chip.filter}
                label={chip.label}
                selected={chip.filter === selectedFilter}
                onPress={() => handleSelectFilter(chip.filter)}
              />
            ))}
          </ScrollView>

          {/*
            4개를 고른 기준을 밝힌다(2026-08-11 디자인 리뷰). 라벨이 없을 때는 왜 이 넷인지
            화면에서 알 방법이 없었다 — 실제 기준은 `getPreviewGears()`의 **최근 추가순**이고,
            말은 창고 정렬 옵션(`GearOrderOptions`)과 같은 것을 쓴다.
          */}
          <View style={styles.criterionLabel}>
            <LiquidSectionLabel>최근 추가순</LiquidSectionLabel>
          </View>

          {/* 장비 행은 카드 하나 안에 헤어라인으로 나눈다 — 행마다 면을 두면 목록이
              카드 더미로 보인다. */}
          <View style={styles.listCard}>
            {previewGears.map((gear, index) => (
              <TouchableOpacity
                key={gear.getId()}
                onPress={() => handleOpenGear(gear)}
                activeOpacity={LiquidMotion.pressOpacity}
                accessibilityRole='button'
                accessibilityLabel={`${gear.getDisplayName()} 상세`}
              >
                <LiquidMetricRow
                  name={gear.getDisplayName()}
                  meta={gear.getDisplayCompany()}
                  value={formatGearWeightOrNull(gear.getWeight())}
                  size='sm'
                  divider={index > 0}
                />
              </TouchableOpacity>
            ))}

            {/* 목록이 끊기는 자리에 이어보기를 둔다(HM-4) — 미리보기를 다 훑은 시점에
                손이 가는 자리다. */}
            <View style={styles.moreDivider} />
            <TouchableOpacity
              style={styles.moreRow}
              onPress={handleOpenWarehouse}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='창고 전체 보기'
            >
              <PretendardText weight='semibold' style={styles.moreText}>
                전체 보기
              </PretendardText>
              <Ionicons
                name='chevron-forward'
                size={14}
                color={Liquid.limeInk}
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: LiquidLayout.section,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    letterSpacing: -0.4,
    color: Liquid.ink,
  },
  sectionCount: {
    fontSize: 13,
    color: Liquid.inkTertiary,
  },
  chipsScroll: {
    marginHorizontal: -LiquidLayout.screenH,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 라벨 자체가 아래 여백 10을 들고 있어(`LiquidSectionLabel`) 위 간격만 준다.
  criterionLabel: {
    marginTop: 16,
  },
  listCard: {
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
    overflow: 'hidden',
  },
  moreDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
    marginLeft: 16,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: LiquidLayout.touchMin,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  // 밝은 면 위 라임 계열 글자는 limeInk — 라임을 글자색으로 직접 쓰지 않는다.
  moreText: {
    fontSize: 14,
    color: Liquid.limeInk,
  },
  emptyCard: {
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: Liquid.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
  },
  emptyCta: {
    marginTop: 18,
  },
});

export default observer(HomeWarehousePreviewView);
