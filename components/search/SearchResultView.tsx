import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidType,
} from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import GearAddMode from '@/model/gear/GearAddMode';
import Feed from '@/model/feed/Feed';
import FeedView from '../feed/FeedView';
import FeedFilterBarView from '../feed/FeedFilterBarView';
import SearchResultContentView from './SearchResultContentView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed?: Feed;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

// SR-2(Liquid Depth): 검색 결과 화면 상단 — 검색 필드 자리는 탐색과 같고, 결과 라벨은
// 개수를 품은 서브라인으로 내려온다.
const RESULT_TITLE = '검색 결과';

const EMPTY_TITLE = '찾는 장비가 없어요';

const EMPTY_TEXT = '카탈로그에 없으면 직접 추가할 수 있어요';

const ADD_CUSTOM_LABEL = '직접 추가하기';

const BROWSE_BRAND_LABEL = '브랜드로 찾기';

const SearchResultView: FC<Props> = ({
  searchWarehouse,
  bag,
  feed,
  gearAddContext,
  children,
}) => {
  const router = useRouter();
  const keyword = searchWarehouse.getKeyword();
  const isEmpty = searchWarehouse.isEmpty();
  const canLoadMore = searchWarehouse.canLoadMore();
  const isLoading = searchWarehouse.isLoading();
  const result = searchWarehouse.getResult();
  const totalCount = searchWarehouse.getTotalCount();

  const handleLoadMore = () => {
    searchWarehouse.searchMore();
  };

  /**
   * 빈 상태의 주 액션 — 이 앱의 핵심 흐름이 "카탈로그에 없으면 내가 등록"인데 그 경로가
   * 화면에 없었다(2026-08-11 디자인 리뷰). 진입 컨텍스트를 그대로 이어 간다:
   * 배낭 컨텍스트면 그 배낭의 커스텀 장비 등록으로, 그 외에는 창고 커스텀 등록으로 간다
   * (`gear-add-options`의 `직접 입력`과 같은 갈래).
   */
  const handleAddCustom = () => {
    const bagId =
      gearAddContext?.mode === GearAddMode.Bag
        ? gearAddContext.bagId
        : undefined;

    router.push(bagId ? `/custom/bag-gear/${bagId}` : '/custom');
  };

  const handleGoToBrandDirectory = () => {
    router.push('/brand-directory');
  };

  // FD-2: 키워드가 없으면 검색 홈(SR-6) 대신 장비 피드를 렌더한다.
  // 피드는 자체 여백을 관리하므로 20px 패딩 컨테이너를 우회해 전체 폭으로 렌더한다.
  // 탐색 탭은 필터 상태 유지를 위해 상위에서 공유하는 feed를 내려준다(FD-3 검색 승계).
  if (!keyword.length) {
    return (
      <FeedView
        bag={bag}
        {...(feed ? { feed } : {})}
        gearAddContext={gearAddContext}
      />
    );
  }

  const showEmpty = isEmpty && !isLoading;

  const render = () => {
    if (showEmpty) {
      /**
       * 빈 상태는 사실 + 다음 걸음 두 줄(Liquid Depth 카피 규칙)에 액션 두 개를 붙인다.
       *
       * 가운데 정렬 대신 **남은 영역 상단 1/3**에 앵커한다 — 세로 가운데에 두면 메시지가
       * 어디에도 정렬되지 않고 떠 있고 아래로 화면 절반이 빈다(2026-08-11 리뷰).
       * 위아래 스페이서 비율(1 : 2)이 그 1/3을 만든다.
       */
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptySpacerTop} />
          <View style={styles.emptyBlock}>
            <PretendardText weight='semibold' style={styles.emptyTitle}>
              {EMPTY_TITLE}
            </PretendardText>
            <PretendardText style={styles.emptyText}>
              {EMPTY_TEXT}
            </PretendardText>
            <View style={styles.emptyActions}>
              <LiquidPillButton
                label={ADD_CUSTOM_LABEL}
                onPress={handleAddCustom}
              />
              <LiquidPillButton
                label={BROWSE_BRAND_LABEL}
                variant='secondary'
                onPress={handleGoToBrandDirectory}
              />
            </View>
          </View>
          <View style={styles.emptySpacerBottom} />
        </View>
      );
    }

    return (
      <SearchResultContentView
        result={result}
        canLoadMore={canLoadMore}
        handleLoadMore={handleLoadMore}
        searchWarehouse={searchWarehouse}
        bag={bag}
        gearAddContext={gearAddContext}
      >
        {children}
      </SearchResultContentView>
    );
  };

  // 검색 승계(SR-1): 검색 결과 위에도 필터 바를 유지 노출한다(정렬은 검색 미적용이라 숨김).
  return (
    <View style={styles.resultContainer}>
      {/**
       * 결과 라벨은 화면 대상이 아니라 **서브라인**이다 — 탐색은 `탐색` 제목 → 검색 필드,
       * 결과는 검색 필드 → `검색 결과` 제목이라 같은 탭에서 필드가 위로 점프했다
       * (2026-08-11 리뷰). 필드 자리를 고정하고 라벨을 아래로 내렸다.
       *
       * 개수는 **총 히트 수**(`nbHits`)라 첫 응답부터 확정이다 — 누적 건수를 쓰면 스크롤할
       * 때마다 숫자가 커지고, 로딩 상태로 가렸다 붙이면 개수가 깜빡인다. 0이면(아직 못 받았거나
       * 결과 없음) 자리만 비운다. 숫자만 콘덴스드다(라틴 전용 — 한글은 본문 서체).
       */}
      <View style={styles.subtitleRow}>
        <PretendardText weight='medium' style={styles.subtitle}>
          {RESULT_TITLE}
          {totalCount > 0 ? (
            <PretendardText style={styles.count}> {totalCount}</PretendardText>
          ) : null}
        </PretendardText>
      </View>

      {feed ? (
        <FeedFilterBarView
          feed={feed}
          showSort={false}
          collapsed={showEmpty}
          topGap={12}
        />
      ) : null}
      <View style={styles.container}>{render()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  resultContainer: {
    flex: 1,
  },
  subtitleRow: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 14,
  },
  subtitle: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  count: {
    fontFamily: LiquidFont.condensed,
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
  container: {
    flex: 1,
    paddingHorizontal: LiquidLayout.screenH,
  },
  emptyContainer: {
    flex: 1,
  },
  emptySpacerTop: {
    flex: 1,
  },
  emptySpacerBottom: {
    flex: 2,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
  // 주 액션(잉크) 위에 여백을 두고, 보조는 그 아래 흰 아웃라인으로 한 단계 낮춘다.
  emptyActions: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
  },
});

export default observer(SearchResultView);
