import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { Color, Radius } from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import {
  getCategoryChips,
  getPreviewGears,
  getUnusedCount,
} from '@/model/home/HomeWarehousePreview';
import app from '@/model/app/App';

interface Props {
  gears: Gear[];
}

// 이보다 적으면 정리 유도가 잔소리가 된다.
const UNUSED_THRESHOLD = 3;

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
  const unusedCount = getUnusedCount(gears);

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
        <TouchableOpacity
          onPress={handleOpenWarehouse}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole='button'
          accessibilityLabel='창고 전체 보기'
        >
          <PretendardText style={styles.sectionMore}>전체 보기</PretendardText>
        </TouchableOpacity>
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
                  <PretendardText weight='bold' style={styles.gearWeight}>
                    {`${gear.getWeight()}g`}
                  </PretendardText>
                  <Ionicons
                    name='chevron-forward'
                    size={16}
                    color={Color.iconMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {unusedCount >= UNUSED_THRESHOLD && (
              <TouchableOpacity
                style={styles.unusedRow}
                onPress={handleOpenWarehouse}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={`한 번도 안 쓴 장비 ${unusedCount}개 보기`}
              >
                <PretendardText style={styles.unusedText}>
                  {`한 번도 안 쓴 장비 ${unusedCount}개`}
                </PretendardText>
                <Ionicons
                  name='chevron-forward'
                  size={16}
                  color={Color.iconMuted}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  sectionMore: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  card: {
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: Radius.modal,
    padding: 18,
  },
  // 칩 줄이 카드 안쪽 여백을 넘어 좌우로 흐르게 한다(스크롤 여지를 보여준다).
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
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  gearIdentity: {
    flex: 1,
    gap: 2,
  },
  gearName: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  gearSub: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  gearWeight: {
    fontSize: 13,
    color: Color.textTertiary,
  },
  unusedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  unusedText: {
    fontSize: 13,
    color: Color.textTertiary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyTitle: {
    fontSize: 17,
    color: Color.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Color.textSecondary,
    marginBottom: 20,
  },
  addButton: {
    alignSelf: 'stretch',
    paddingVertical: 15,
    borderRadius: Radius.card,
    backgroundColor: Color.inputBg,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
});

export default observer(HomeWarehousePreviewView);
