import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { Acg } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgHighlightText from '@/components/acg/AcgHighlightText';
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

/**
 * HM-4 창고 미리보기.
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
        <AcgHighlightText fontSize={SECTION_TITLE_SIZE}>
          <PretendardText weight='bold' style={styles.sectionTitle}>
            내 창고
          </PretendardText>
        </AcgHighlightText>
      </View>

      <View style={styles.card}>
        {gears.length === 0 ? (
          <View style={styles.empty}>
            <PretendardText weight='bold' style={styles.emptyTitle}>
              창고가 비어 있어요
            </PretendardText>
            <PretendardText style={styles.emptySubtitle}>
              가진 장비를 하나씩 담아보세요
            </PretendardText>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddGear}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel='첫 장비 담기'
            >
              <PretendardText weight='bold' style={styles.addButtonText}>
                첫 장비 담기
              </PretendardText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              style={styles.chipsScroll}
            >
              {chips.map(chip => (
                <CategoryChipView
                  key={chip.filter}
                  label={chip.label}
                  selected={chip.filter === selectedFilter}
                  onPress={() => handleSelectFilter(chip.filter)}
                />
              ))}
            </ScrollView>

            <View style={styles.gearList}>
              {previewGears.map(gear => (
                <TouchableOpacity
                  key={gear.getId()}
                  style={styles.gearRow}
                  onPress={() => handleOpenGear(gear)}
                  activeOpacity={0.7}
                  accessibilityRole='button'
                  accessibilityLabel={`${gear.getDisplayName()} 상세`}
                >
                  <View style={styles.gearIdentity}>
                    <PretendardText
                      weight='bold'
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
                  <AcgDisplayText style={styles.gearWeight}>
                    {`${gear.getWeight()}g`}
                  </AcgDisplayText>
                  <Ionicons
                    name='chevron-forward'
                    size={13}
                    color={Acg.textSecondary}
                  />
                </TouchableOpacity>
              ))}

              {/* 목록이 끊기는 자리에 이어보기를 둔다(HM-4). 헤더 우측에 있을 때보다
                  "여기서 더 있다"가 분명하고, 미리보기를 다 훑은 시점에 손이 가는 자리다.
                  장비 행과 같은 행 문법을 쓰되 글자색을 낮춰 장비 항목과 구분한다. */}
              <TouchableOpacity
                style={styles.moreRow}
                onPress={handleOpenWarehouse}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel='창고 전체 보기'
              >
                <PretendardText weight='semibold' style={styles.moreText}>
                  전체 보기
                </PretendardText>
                <Ionicons
                  name='chevron-forward'
                  size={13}
                  color={Acg.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

// 섹션 제목 크기(ACG) — 18px/700.
const SECTION_TITLE_SIZE = 18;

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHead: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SECTION_TITLE_SIZE,
    color: Acg.textTertiary,
  },
  card: {
    marginTop: 2,
  },
  chipsScroll: {
    marginHorizontal: -18,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  gearList: {
    marginTop: 14,
  },
  // 장비 행은 종이 면 — 행 사이는 8px로 띄운다(ACG).
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: Acg.paper,
    boxShadow: '0 1px 0 rgba(26,26,26,0.06)',
  },
  gearIdentity: {
    flex: 1,
    gap: 2,
  },
  gearName: {
    fontSize: 14,
    color: Acg.ink,
  },
  gearSub: {
    fontSize: 12,
    color: Acg.textSecondary,
  },
  // 무게는 라임 텍스트로 — 밝은 종이 면 위 액센트(ACG).
  gearWeight: {
    fontSize: 14,
    color: Acg.limeText,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: Acg.paper,
    boxShadow: '0 1px 0 rgba(26,26,26,0.06)',
  },
  moreText: {
    fontSize: 14,
    color: Acg.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Acg.paper,
    boxShadow: '0 1px 0 rgba(26,26,26,0.06)',
  },
  emptyTitle: {
    fontSize: 17,
    color: Acg.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Acg.textSecondary,
    marginBottom: 20,
  },
  addButton: {
    alignSelf: 'stretch',
    marginHorizontal: 18,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: Acg.ink,
  },
  addButtonText: {
    fontSize: 15,
    color: Acg.paper,
  },
});

export default observer(HomeWarehousePreviewView);
