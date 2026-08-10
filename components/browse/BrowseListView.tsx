import { FC, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Browse from '@/model/browse/Browse';
import BrowseSort from '@/model/search/BrowseSort';
import Bag from '@/model/bag/Bag';
import Gear from '@/model/gear/Gear';
import PretendardText from '@/components/PretendardText';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
import SearchGearView from '../search/SearchGearView';
import SearchSkeletonView from '../search/SearchSkeletonView';
import BrowseSortButtonView from './BrowseSortButtonView';
import app from '@/model/app/App';

interface Props {
  browse: Browse;
  bag: Bag;
  title: string;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 직접 그린다.
const IS_IOS = Platform.OS === 'ios';
// 크롬 아래 제목 블록이 시작하는 여백(창고 WH-1과 같은 값).
const HEADER_TOP_GAP = 6;
const END_REACHED_THRESHOLD = 0.1;

/**
 * SR-7 카테고리·브랜드 장비 목록 (Liquid Depth, 2026-08-11 이식).
 *
 * 지면은 지형 없이 `canvas` + 우상단 라임 글로우다(창고·브랜드 디렉토리와 같은 판단).
 * 제목 블록이 화면 대상(카테고리·브랜드 이름)과 정렬을 함께 들고, 장비 행은 각자 종이 카드로
 * 놓인다 — 무한 스크롤로 자라는 목록이라 창고처럼 카드 하나에 담지 않는다(`SearchGearView` 주석).
 * 라임 면은 담기 CTA 하나뿐이다.
 */
const BrowseListView: FC<Props> = ({ browse, bag, title }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const result = browse.getResult();
  const sort = browse.getSort();
  const isLoading = browse.isLoading();
  const isEmpty = browse.isEmpty();
  const canLoadMore = browse.canLoadMore();

  // 최초 포커스는 Wrapper의 initialize()가 이미 로드하므로 스킵(중복 로드 방지).
  // 화면 복귀(재포커스) 시에만 보유 배지 동기화를 위해 reload한다.
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;

        return;
      }

      browse.reload();
    }, [browse])
  );

  const handleBack = () => {
    router.back();
  };

  const handleSelectSort = (value: BrowseSort) => {
    app.getAnalyticsManager()?.logClick('browse_sort', { sort: value });
    browse.changeSort(value);
  };

  const handleLoadMore = () => {
    browse.loadMore();
  };

  const renderItem = ({ item }: { item: Gear }) => (
    <SearchGearView gear={item} searchWarehouse={browse} bag={bag} />
  );

  const renderContent = () => {
    if (isEmpty && isLoading) {
      // 스피너 대신 도착할 목록과 같은 골격을 그린다.
      return (
        <View style={styles.skeletonContainer}>
          <SearchSkeletonView count={6} />
        </View>
      );
    }

    if (isEmpty) {
      // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions).
      return (
        <View style={styles.emptyContainer}>
          <PretendardText weight='bold' style={styles.emptyTitle}>
            장비가 없어요
          </PretendardText>
          <PretendardText style={styles.emptyText}>
            다른 카테고리나 브랜드를 둘러볼까요?
          </PretendardText>
        </View>
      );
    }

    return (
      <FlatList
        data={result}
        renderItem={renderItem}
        keyExtractor={(gear: Gear) => gear.getId()}
        onEndReached={canLoadMore ? handleLoadMore : null}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        // 제목 블록이 상단에 고정돼 있어 자동 인셋을 쓰지 않는다(창고와 같은 구조).
        contentInsetAdjustmentBehavior='never'
        ListFooterComponent={
          isLoading ? (
            <View style={styles.footerSkeleton}>
              <SearchSkeletonView count={3} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
          **타이틀은 비운다** — 화면 대상은 본문 제목 블록이 들고, 정렬도 그 줄에 둔다.
          두 플랫폼이 같은 그림을 보되 만드는 주체만 다르다(창고와 같은 처리). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.chrome}>
          <LiquidGlassCircleButton
            icon='chevron-back'
            onPress={handleBack}
            accessibilityLabel='뒤로가기'
          />
        </View>
      )}
      <View
        style={[
          styles.header,
          // 투명 헤더(상태바 + 44pt) 아래에서 고정 상단 콘텐츠가 시작하게 한다.
          IS_IOS && {
            paddingTop: insets.top + LiquidLayout.navBar + HEADER_TOP_GAP,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <PretendardText weight='bold' style={styles.title} numberOfLines={1}>
            {title}
          </PretendardText>
          {/* 목록이 비어도, 로드 중이어도 내리지 않는다 — 정렬은 결과를 바꾸는 컨트롤이라
              결과가 없을 때가 오히려 필요하다(이식 전 iOS `headerRight`와 같은 노출 조건). */}
          <BrowseSortButtonView sort={sort} onSelect={handleSelectSort} />
        </View>
      </View>
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 Layout이 받는 LiquidBackdrop이 깐다.
    backgroundColor: 'transparent',
  },
  // 크롬 좌우 여백은 콘텐츠(20)보다 좁다 — 유리 원이 화면 가장자리에 가깝게 앉는다(목업 §8).
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  header: {
    paddingTop: HEADER_TOP_GAP,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 좌: 제목 / 우: 정렬. 아래를 맞춰(flex-end) 정렬 버튼이 제목 밑선에 앉는다.
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  content: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: LiquidLayout.scrollBottom,
    gap: LiquidLayout.listGap,
  },
  skeletonContainer: {
    paddingTop: 16,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 다음 페이지 자리 — 목록의 카드 간격과 같은 값으로 띄운다.
  footerSkeleton: {
    marginTop: LiquidLayout.listGap,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: LiquidLayout.screenH,
  },
  emptyTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
});

export default observer(BrowseListView);
