import { FC, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feed from '@/model/feed/Feed';
import { toFeedSort, getFeedSortLabel } from '@/model/feed/FeedSort';
import BrandDirectory from '@/model/browse/BrandDirectory';
import { BrandRankData } from '@/model/search/BrandRankStore';
import { FeedBrandInterest } from '@/model/feed/FeedInterestProfile';
import { toBrandKey } from '@/model/store/BrandKey';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidSearchField from '@/components/liquid/LiquidSearchField';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';
import BrandRowSkeletonView from '@/components/browse/BrandRowSkeletonView';
import BrandRowView from '@/components/browse/BrandRowView';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import app from '@/model/app/App';

const CONFIRM_LABEL = '확인';

// 선택 요약 칩 높이 — 2차 칩(28)보다 한 단계 크다. 안에 지우기 글리프를 함께 담는다.
const SUMMARY_CHIP_HEIGHT = 32;

/**
 * 요약 칩 터치 여유. 칩은 32로 그린다 — 키우면 칩 줄이 두꺼워져 아래 목록과 위계가 흔들린다.
 * HIG 44는 세로 여유로만 채운다: (44 − 32) / 2 = 6. 가로는 0 — 가로 스크롤에서 이웃 칩과 겹친다.
 */
const SUMMARY_CHIP_HIT_SLOP = { top: 6, bottom: 6, left: 0, right: 0 };

// 닫기 아이콘(24) 터치 여유 — 버튼 박스가 이미 44pt라 남는 여유만 더한다.
const CLOSE_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props {
  feed: Feed;
  visible: boolean;
  onClose: () => void;
}

/**
 * FD-3 브랜드 필터 시트 (Liquid Depth, 2026-08-11 이식).
 *
 * iOS 네이티브 pageSheet 프레젠테이션(카드 슬라이드·스와이프 닫기·라운드 코너는 OS 처리).
 * **지면(canvas) 위 종이 카드** 문법이다 — 브랜드 행이 각자 카드로 놓이고, 검색 필드는
 * 그 위에 뜬 유리다(배낭 선택 시트 CS-5와 같은 판단: 유리 시트 면 위에 흰 카드를 얹으면
 * 두 면이 겹쳐 카드 경계가 사라진다).
 *
 * 브랜드 목록·검색은 BrandDirectory 모델을 재사용하고, 선택은 시트 안에서 스테이징돼
 * `확인`으로 일괄 적용된다. 스와이프 다운 닫기/뒤로가기 = 취소(스테이징 폐기).
 * 스와이프 닫힘 시 onDismiss로 부모 visible을 반드시 초기화한다.
 */
const FeedFilterSheetView: FC<Props> = ({ feed, visible, onClose }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [brandDirectory] = useState(() => BrandDirectory.new(router));

  // 스테이징 로컬 상태 — 시트 열릴 때 현재 적용 브랜드로 초기화한다(피드 재조회 없음).
  const [stagedBrands, setStagedBrands] = useState<FeedBrandInterest[]>([]);

  const brands = brandDirectory.getBrands();
  const isLoading = brandDirectory.isLoading();
  const isEmpty = brandDirectory.isEmpty();
  const keyword = brandDirectory.getKeyword();

  const stagedCount = stagedBrands.length;
  const hasStagedFilter = stagedCount > 0;
  const confirmLabel =
    stagedCount > 0 ? `${CONFIRM_LABEL} (${stagedCount})` : CONFIRM_LABEL;

  useEffect(() => {
    if (!visible) {
      return;
    }

    // 열릴 때마다 스테이징을 현재 적용 브랜드로 동기화한다.
    setStagedBrands([...feed.getFilterBrands()]);

    brandDirectory.initialize();
  }, [visible, brandDirectory, feed]);

  // 취소: 스테이징을 폐기하고 닫는다(적용 브랜드 유지). 스와이프 닫힘·뒤로가기 공통 경로.
  const handleCancel = () => {
    onClose();
  };

  // FD-3 `확인`: 스테이징 브랜드를 원자 적용한 뒤 닫는다(변경 없으면 applyBrands가 no-op).
  const handleApply = () => {
    app.getAnalyticsManager()?.logClick('feed_filter_apply', {
      category: feed.getFilterCategory() ?? 'all',
      brand_count: stagedBrands.length,
      sort: getFeedSortLabel(toFeedSort(feed.getSort())),
    });
    feed.applyBrands(stagedBrands);
    onClose();
  };

  const handleChangeKeyword = (text: string) => {
    brandDirectory.changeKeyword(text);
  };

  const handleClearKeyword = () => {
    brandDirectory.clearKeyword();
  };

  const handleSelectBrand = (brand: BrandRankData) => {
    const key = toBrandKey(brand.companyKorean, brand.company);

    setStagedBrands(prev => {
      const exists = prev.some(
        staged => toBrandKey(staged.companyKorean, staged.company) === key
      );

      if (exists) {
        return prev.filter(
          staged => toBrandKey(staged.companyKorean, staged.company) !== key
        );
      }

      return [
        ...prev,
        { companyKorean: brand.companyKorean, company: brand.company },
      ];
    });
  };

  // 선택 브랜드 요약 칩에서 개별 브랜드 스테이징 해제.
  const handleRemoveStagedBrand = (brand: FeedBrandInterest) => {
    const key = toBrandKey(brand.companyKorean, brand.company);

    setStagedBrands(prev =>
      prev.filter(
        staged => toBrandKey(staged.companyKorean, staged.company) !== key
      )
    );
  };

  // 초기화: 브랜드 스테이징 전체 해제(적용은 `확인` 시점).
  const handleReset = () => {
    app.getAnalyticsManager()?.logClick('feed_filter_reset');
    setStagedBrands([]);
  };

  const isSelectedBrand = (brand: BrandRankData) => {
    const key = toBrandKey(brand.companyKorean, brand.company);

    return stagedBrands.some(
      staged => toBrandKey(staged.companyKorean, staged.company) === key
    );
  };

  // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions). 원인마다 다음 걸음이
  // 다르다 — 검색어를 넣지 않았는데 비어 있으면 철자를 확인하라고 말할 수 없다
  // (brand-rank 로드 실패도 빈 배열로 온다). 브랜드 디렉토리(SR-8)와 같은 두 갈래다.
  const getEmptyMessage = (): { fact: string; next: string } => {
    if (keyword.trim()) {
      return {
        fact: '찾는 브랜드가 없어요',
        next: '이름을 다시 확인해볼까요?',
      };
    }

    return {
      fact: '아직 브랜드가 없어요',
      next: '잠시 뒤에 다시 열어볼까요?',
    };
  };

  const renderBrandList = () => {
    if (isLoading && isEmpty) {
      // 스피너 대신 도착할 목록과 같은 골격을 그린다.
      return (
        <View style={styles.skeletonContainer}>
          {/* 이 시트의 행은 `제품 n` 줄이 없다(`showCount={false}`) — 스켈레톤도 한 줄이다. */}
          <BrandRowSkeletonView count={8} showMeta={false} />
        </View>
      );
    }

    if (isEmpty) {
      const { fact, next } = getEmptyMessage();

      return (
        <View style={styles.emptyContainer}>
          <PretendardText weight='bold' style={styles.emptyTitle}>
            {fact}
          </PretendardText>
          <PretendardText style={styles.emptyText}>{next}</PretendardText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.brandList}
        contentContainerStyle={styles.brandListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {brands.map(brand => (
          <BrandRowView
            key={brand.brandKey}
            brand={brand}
            selectable
            selected={isSelectedBrand(brand)}
            onPress={() => handleSelectBrand(brand)}
            showCount={false}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleCancel}
      onDismiss={handleCancel}
    >
      {/* 키보드 회피: 브랜드 검색 포커스 시 목록·확인 버튼이 가려지지 않게 한다.
          pageSheet 안에서는 'padding'이 키보드 높이를 잘못 보정하므로 배낭 담기 모달과 동일하게 'height'를 쓴다. */}
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior='height'
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* pageSheet Modal은 OS 그래버가 없다 — 핸들바를 직접 그리고 닫기를 둔다.
            하단이 `확인` 하나뿐이라, 없으면 적용하지 않고 나가는 길이 스와이프뿐이었다. */}
        <SheetGrabberView />
        <View style={styles.header}>
          <PretendardText style={styles.title} weight='bold'>
            브랜드
          </PretendardText>
          <View style={styles.headerActions}>
            {hasStagedFilter ? (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
                activeOpacity={LiquidMotion.pressOpacity}
                accessibilityRole='button'
                accessibilityLabel='선택한 브랜드 초기화'
              >
                <PretendardText style={styles.resetText} weight='semibold'>
                  초기화
                </PretendardText>
              </TouchableOpacity>
            ) : null}
            {/* 스와이프 닫기와 같은 경로 — 스테이징을 폐기하고 닫는다(적용 브랜드 유지). */}
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.closeButton}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='닫기'
              hitSlop={CLOSE_HIT_SLOP}
            >
              <Ionicons name='close' size={24} color={Liquid.ink} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.brandSection}>
          <LiquidSearchField
            value={keyword}
            onChangeText={handleChangeKeyword}
            onClear={handleClearKeyword}
            placeholder='브랜드명을 검색해보세요'
            accessibilityLabel='브랜드명 검색'
          />
          {hasStagedFilter ? (
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps='handled'
              style={styles.summaryChips}
              contentContainerStyle={styles.summaryChipsContent}
            >
              {stagedBrands.map(brand => {
                const key = toBrandKey(brand.companyKorean, brand.company);
                const label = brand.companyKorean || brand.company;

                return (
                  // 고른 것은 선택 칩과 같은 잉크 채움이고, 지우기 글리프가 뒤에 붙는다 —
                  // 칩 자체가 해제 버튼이라 롤은 `button`이다.
                  <TouchableOpacity
                    key={key}
                    style={styles.summaryChip}
                    onPress={() => handleRemoveStagedBrand(brand)}
                    activeOpacity={LiquidMotion.pressOpacity}
                    hitSlop={SUMMARY_CHIP_HIT_SLOP}
                    accessibilityRole='button'
                    accessibilityLabel={`${label} 선택 해제`}
                  >
                    <PretendardText
                      style={styles.summaryChipText}
                      weight='semibold'
                    >
                      {label}
                    </PretendardText>
                    <Ionicons name='close' size={14} color={Liquid.surface} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
          <View style={styles.brandListContainer}>{renderBrandList()}</View>
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <LiquidPillButton
            label={confirmLabel}
            variant='primary'
            block
            onPress={handleApply}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Liquid.canvas,
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // 닫기 버튼의 44pt 박스가 시트 우측 여백(20)을 먹고 들어가 아이콘이 안쪽으로 밀리지 않게 한다.
    marginRight: -10,
  },
  // 시트 제목은 화면 대상이라 title3 — 목록 행(15)과 위계가 갈린다(sort-sheet 선례).
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  // 글자만 있는 버튼이라 시각 높이가 라인박스뿐이다 — HIG 44pt를 박스로 채운다.
  resetButton: {
    minHeight: LiquidLayout.touchMin,
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
  // HIG 최소 터치 타깃 44×44pt.
  closeButton: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSection: {
    flex: 1,
  },
  summaryChips: {
    flexGrow: 0,
    marginTop: 10,
  },
  summaryChipsContent: {
    gap: 8,
    paddingRight: 8,
  },
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 알약이 깨지지 않는다.
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: SUMMARY_CHIP_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.ink,
  },
  summaryChipText: {
    fontSize: 13,
    color: Liquid.surface,
  },
  brandListContainer: {
    flex: 1,
    marginTop: 10,
  },
  brandList: {
    flex: 1,
  },
  brandListContent: {
    paddingTop: 2,
    paddingBottom: 8,
    gap: LiquidLayout.listGap,
  },
  skeletonContainer: {
    paddingTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 60,
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
  footer: {
    paddingTop: 12,
    backgroundColor: Liquid.canvas,
  },
});

export default observer(FeedFilterSheetView);
