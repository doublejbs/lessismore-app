import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import FeedChipView from '@/components/feed/FeedChipView';
import { Acg, AcgFontSize, AcgRadius, AcgRow } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
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
 * 칩은 탐색 탭과 같은 `FeedChipView`를 **같은 크기로** 쓴다(`compact`는 탐색에서 1차 칩 행 아래
 * 2차 세분 카테고리를 뜻하는 크기라, 위에 1차 행이 없는 홈에서는 그냥 작아 보인다).
 *
 * 장비 행은 **레퍼런스 목록 문법**이다(2026-08-11): 면 없이 지면에 놓고 이름(19, 두 줄까지) +
 * 메타 한 줄(15 잉크, `무게 · 브랜드 · 카테고리`) + 우측 셰브론, 행 사이 헤어라인.
 * 행마다 면을 두면 카드가 여럿이 되어 위 일정 면과 위계가 뒤엉킨다.
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
        <AcgSectionHeaderView title='내 창고' />

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
      {/* 부제는 목록의 **기준**을 밝힌다(레퍼런스) — 미리보기가 왜 이 4개인지 말해 준다. */}
      <AcgSectionHeaderView title='내 창고' subtitle='최근 담은 장비' />

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
            selected={chip.filter === selectedFilter}
            onPress={() => handleSelectFilter(chip.filter)}
          />
        ))}
      </ScrollView>

      <View style={styles.gearList}>
        {previewGears.map((gear, index) => (
          <TouchableOpacity
            key={gear.getId()}
            style={[styles.row, index > 0 && styles.rowDivided]}
            onPress={() => handleOpenGear(gear)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${gear.getDisplayName()} 상세`}
          >
            <View style={styles.rowText}>
              <PretendardText
                weight='semibold'
                style={styles.rowTitle}
                numberOfLines={2}
              >
                {gear.getDisplayName()}
              </PretendardText>

              {/* 레퍼런스처럼 값을 **한 줄에 `·`로** 묶는다(별점·난이도·거리 → 무게·브랜드·카테고리).
                  무게를 맨 앞에 둬 행마다 같은 자리에서 비교된다 — 우측 정렬 열로 빼면
                  이름이 두 줄인 행에서 숫자가 아래로 밀려 오히려 비교가 어긋난다.
                  숫자만 콘덴스드라 중첩 Text로 서체를 갈아 끼운다. */}
              <PretendardText style={styles.rowMeta} numberOfLines={1}>
                <AcgDisplayText style={styles.rowMetaStrong}>
                  {`${gear.getWeight()}g`}
                </AcgDisplayText>
                {[gear.getDisplayCompany(), gear.getFineCategoryLabel()]
                  .filter(Boolean)
                  .map(part => ` · ${part}`)
                  .join('')}
              </PretendardText>
            </View>

            <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
          </TouchableOpacity>
        ))}

        {/* 목록이 끊기는 자리에 이어보기를 둔다(HM-4). 헤더 우측에 있을 때보다
            "여기서 더 있다"가 분명하고, 미리보기를 다 훑은 시점에 손이 가는 자리다. */}
        <TouchableOpacity
          style={[styles.row, styles.rowDivided]}
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
  // 칩 행만 화면 패딩 밖으로 빼 지면 끝까지 흐르게 한다(탐색 탭과 같은 규칙).
  chipsScroll: {
    marginHorizontal: -SCREEN_H,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    // 탐색 탭 칩 행과 같은 간격(FD-3).
    gap: 12,
    paddingHorizontal: SCREEN_H,
  },
  gearList: {
    marginTop: 6,
  },
  /**
   * 레퍼런스 목록 행 — 이름(두 줄까지) + 메타 한 줄. 헤어라인은 지형 지면 위라
   * `line2`(잉크 알파)다. 순백용 `hairline`은 이 지면에서 보이지 않는다.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.line2,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 25,
    color: Acg.ink,
  },
  // 메타는 회색이 아니라 잉크다(레퍼런스) — 무게·브랜드는 장식이 아니라 정보다.
  rowMeta: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.ink,
  },
  rowMetaStrong: {
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.ink,
  },
  moreText: {
    flex: 1,
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.textMuted,
  },
  tile: {
    backgroundColor: Acg.paper,
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
