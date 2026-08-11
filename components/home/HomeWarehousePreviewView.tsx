import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import FeedChipView from '@/components/feed/FeedChipView';
import { Acg, AcgFontSize, AcgRadius } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import {
  getCategoryChips,
  getPreviewGears,
} from '@/model/home/HomeWarehousePreview';
import app from '@/model/app/App';

interface Props {
  gears: Gear[];
}

// 화면 좌우 패딩(HomeView) — 칩 행만 이 값만큼 밖으로 빼 지면 끝까지 흐르게 한다.
const SCREEN_H = 16;

// 장비 행 — 44pt 터치 타깃을 넘긴다.
const GEAR_ROW_HEIGHT = 56;

const CTA_HEIGHT = 48;

/**
 * HM-4 창고 미리보기.
 *
 * 총 개수·총 무게 같은 집계는 두지 않는다 — 홈에서 알고 싶은 건 "몇 개 있나"가 아니라
 * "뭐가 있나"다. 대신 대분류 칩으로 좁혀 보고, 더 보려면 `전체 보기`로 창고에 들어간다.
 *
 * 칩 선택은 **이 컴포넌트의 로컬 상태**다. 창고 화면의 `FilterManager`를 건드리면
 * 홈에서 훑어본 게 창고 화면 상태까지 바꿔 버린다 — 훑기와 작업은 분리한다.
 *
 * 표현은 탐색 탭(FD-2/FD-3)과 같다(2026-08-11): 칩은 탐색과 같은 `FeedChipView`, 장비 행은
 * 면 없이 순백 지면에 놓고 헤어라인으로만 가른다. 행마다 흰 종이 면을 두면 순백 지면에서
 * 면이 보이지 않아 그림자만 남고, 카드가 여럿이면 위 일정 면과 위계가 뒤엉킨다.
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

  if (gears.length === 0) {
    return (
      <View style={styles.section}>
        <PretendardText weight='semibold' style={styles.sectionTitle}>
          내 창고
        </PretendardText>

        <View style={styles.tile}>
          <PretendardText weight='semibold' style={styles.emptyTitle}>
            창고가 비어 있어요
          </PretendardText>
          <PretendardText style={styles.emptySubtitle}>
            가진 장비를 하나씩 담아보세요
          </PretendardText>
          {/* 홈의 라임은 일정 면의 주 액션 하나뿐이라, 이 버튼은 잉크 알약이다. */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddGear}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='첫 장비 담기'
          >
            <PretendardText weight='semibold' style={styles.addButtonText}>
              첫 장비 담기
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <PretendardText weight='semibold' style={styles.sectionTitle}>
        내 창고
      </PretendardText>

      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {chips.map(chip => (
          <FeedChipView
            key={chip.filter}
            label={chip.label}
            compact={true}
            selected={chip.filter === selectedFilter}
            onPress={() => handleSelectFilter(chip.filter)}
          />
        ))}
      </ScrollView>

      <View style={styles.gearList}>
        {previewGears.map((gear, index) => (
          <TouchableOpacity
            key={gear.getId()}
            style={[styles.gearRow, index > 0 && styles.gearRowDivided]}
            onPress={() => handleOpenGear(gear)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${gear.getDisplayName()} 상세`}
          >
            <View style={styles.gearIdentity}>
              <PretendardText
                weight='semibold'
                style={styles.gearName}
                numberOfLines={1}
              >
                {gear.getDisplayName()}
              </PretendardText>
              <PretendardText style={styles.gearSub} numberOfLines={1}>
                {[gear.getDisplayCompany(), gear.getFineCategoryLabel()]
                  .filter(Boolean)
                  .join(' · ')}
              </PretendardText>
            </View>
            {/* 무게는 탐색 셀과 같은 앵커 값이라 콘덴스드 잉크로 둔다(라임 텍스트 아님). */}
            <AcgDisplayText style={styles.gearWeight}>
              {`${gear.getWeight()}g`}
            </AcgDisplayText>
            <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
          </TouchableOpacity>
        ))}

        {/* 목록이 끊기는 자리에 이어보기를 둔다(HM-4). 헤더 우측에 있을 때보다
            "여기서 더 있다"가 분명하고, 미리보기를 다 훑은 시점에 손이 가는 자리다. */}
        <TouchableOpacity
          style={[styles.gearRow, styles.gearRowDivided]}
          onPress={handleOpenWarehouse}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='창고 전체 보기'
        >
          <PretendardText weight='semibold' style={styles.moreText}>
            전체 보기
          </PretendardText>
          <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
  // 칩 행만 화면 패딩 밖으로 빼 지면 끝까지 흐르게 한다(탐색 탭과 같은 규칙).
  chipsScroll: {
    marginHorizontal: -SCREEN_H,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SCREEN_H,
  },
  gearList: {
    marginTop: 6,
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: GEAR_ROW_HEIGHT,
  },
  gearRowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  gearIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  gearName: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.ink,
  },
  gearSub: {
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    color: Acg.textMuted,
  },
  gearWeight: {
    fontSize: AcgFontSize.rowTitle,
    color: Acg.ink,
  },
  moreText: {
    flex: 1,
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.textMuted,
  },
  tile: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    gap: 4,
  },
  emptyTitle: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 25,
    color: Acg.ink,
  },
  emptySubtitle: {
    fontSize: AcgFontSize.meta,
    lineHeight: 20,
    color: Acg.textMuted,
  },
  addButton: {
    marginTop: 10,
    minHeight: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.ink,
  },
  addButtonText: {
    fontSize: AcgFontSize.control,
    color: Acg.paper,
  },
});

export default observer(HomeWarehousePreviewView);
