import { FC } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import Feed from '@/model/feed/Feed';
import Bag from '@/model/bag/Bag';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import SearchRank from '@/model/search/SearchRank';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import SearchRankRowView from '../search/SearchRankRowView';
import SearchRankSkeletonView from '../search/SearchRankSkeletonView';
import SearchGearAddToBagModalView from '../search/SearchGearAddToBagModalView';
import useSearchRankRowState from '../search/useSearchRankRowState';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
  bag: Bag;
  searchRank: SearchRank;
  category: GearFilter;
  // 그릴 순위(상위 5개로 이미 잘린 목록).
  gears: Gear[];
  isRankingLoading: boolean;
  // 로딩 스켈레톤 행 수 = 섹션이 그리는 행 수.
  rankingCount: number;
}

// 섹션 머리와 첫 행 사이. 행이 위아래 패딩(AcgRow)을 갖고 있어 머리 쪽 여백은 작게 둔다.
const SECTION_HEADER_GAP = 4;
// 제목과 우측 카테고리 라벨 사이 최소 간격.
const HEADER_META_GAP = 12;
// `전체 순위 보기` 행 최소 높이(FD-6) — 44pt 터치 타깃 위로 여유를 둔다.
const SEE_ALL_MIN_HEIGHT = 48;
const SEE_ALL_ICON_SIZE = 18;
// 섹션과 피드 그리드 첫 행 사이.
const SECTION_BOTTOM_GAP = 16;

/**
 * FD-6: 피드 상단 인기 순위 섹션(`FlatList`의 `ListHeaderComponent`).
 *
 * 섹션 머리 `인기 순위` + 현재 카테고리 라벨 → 상위 5개 순위 행 → `전체 순위 보기 ›`.
 * 행은 전용 순위 화면과 같은 `SearchRankRowView`이고, 담기·제거 동작도 같은 훅을 쓴다.
 * 이 섹션 자체는 플로팅 버튼을 대신한다 — 탭의 라임은 순위 1~3위 배지뿐이다.
 */
const FeedRankingSectionView: FC<Props> = ({
  feed,
  bag,
  searchRank,
  category,
  gears,
  isRankingLoading,
  rankingCount,
}) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const {
    showModal,
    selectedGear,
    isGearLoading,
    handleGearPress,
    handleAddPress,
    handleRemovePress,
    handleCloseModal,
  } = useSearchRankRowState(searchRank);

  // SR-4: 현재 선택된 카테고리를 순위 화면으로 승계한다(그룹 카테고리 기준).
  // 분석 이벤트는 플로팅 버튼 시절의 `click_feed_ranking`을 그대로 쓴다(추세 연속).
  const handleSeeAllPress = () => {
    app.getAnalyticsManager()?.logClick('feed_ranking');

    const filterCategory = feed.getFilterCategory();

    if (filterCategory) {
      router.push(`/popular-ranking?category=${filterCategory}`);
    } else {
      router.push('/popular-ranking');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PretendardText
          weight='semibold'
          style={styles.title}
          accessibilityRole='header'
        >
          {l10n.t('feed.rankingTitle')}
        </PretendardText>
        <PretendardText style={styles.categoryLabel} numberOfLines={1} weight='medium'>
          {getGearFilterName(category)}
        </PretendardText>
      </View>

      {isRankingLoading ? (
        <SearchRankSkeletonView count={rankingCount} />
      ) : (
        gears.map((gear, index) => (
          <SearchRankRowView
            key={gear.getId()}
            gear={gear}
            index={index}
            isLoading={isGearLoading(gear)}
            divided={index > 0}
            onPress={() => handleGearPress(gear)}
            onAddPress={e => handleAddPress(e, gear)}
            onRemovePress={e => handleRemovePress(e, gear)}
          />
        ))
      )}

      {/* 누를 수 있음은 셰브론으로만 알린다(HM-8 — 색으로 말하지 않는다). */}
      <Pressable
        style={({ pressed }) => [styles.seeAll, pressed && styles.seeAllPressed]}
        onPress={handleSeeAllPress}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('feed.rankingSeeAll')}
      >
        <PretendardText style={styles.seeAllText}>
          {l10n.t('feed.rankingSeeAll')}
        </PretendardText>
        <Ionicons
          name='chevron-forward'
          size={SEE_ALL_ICON_SIZE}
          color={Acg.ink}
        />
      </Pressable>

      {selectedGear && (
        <SearchGearAddToBagModalView
          visible={showModal}
          onClose={handleCloseModal}
          gear={selectedGear}
          bag={bag}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SECTION_BOTTOM_GAP,
  },
  // AcgSectionHeaderView 문법(제목 18 semibold 잉크) + 우측 메타(현재 카테고리).
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: HEADER_META_GAP,
    marginBottom: SECTION_HEADER_GAP,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
  },
  categoryLabel: {
    ...AcgType.meta,
    color: Acg.textMuted,
    flexShrink: 1,
  },
  // 마지막 행. 순위 행과 같은 헤어라인으로 이어 붙인다.
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: SEE_ALL_MIN_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  seeAllPressed: {
    backgroundColor: Acg.controlFill,
  },
  seeAllText: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
});

export default observer(FeedRankingSectionView);
