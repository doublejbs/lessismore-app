import { FC, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
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
import { AcgLayout, Color, Radius } from '@/constants/DesignTokens';
import SearchSkeletonView from '@/components/search/SearchSkeletonView';
import BrandRowView from '@/components/browse/BrandRowView';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import app from '@/model/app/App';

const CONFIRM_LABEL = '확인';

interface Props {
  feed: Feed;
  visible: boolean;
  onClose: () => void;
}

// FD-3: 브랜드 전용 시트. iOS 네이티브 pageSheet 프레젠테이션(카드 슬라이드·스와이프 닫기·라운드 코너는 OS 처리).
// 브랜드 검색/목록(내부 스크롤) + 선택 요약 칩 + 초기화 + 하단 고정 `확인`으로 구성된다.
// 브랜드 목록·검색은 BrandDirectory 모델을 재사용하고, 선택은 시트 안에서 스테이징돼 `확인`으로 일괄 적용된다.
// 스와이프 다운 닫기/뒤로가기 = 취소(스테이징 폐기). 스와이프 닫힘 시 onDismiss로 부모 visible을 반드시 초기화한다.
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

  const renderBrandList = () => {
    if (isLoading && isEmpty) {
      return (
        <View style={styles.skeletonContainer}>
          <SearchSkeletonView count={8} />
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            브랜드가 없습니다
          </PretendardText>
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
                onPress={handleReset}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
              accessibilityRole='button'
              accessibilityLabel='닫기'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name='close' size={24} color={Color.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.brandSection}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              value={keyword}
              onChangeText={handleChangeKeyword}
              placeholder='브랜드명을 검색해보세요'
              placeholderTextColor={Color.textSecondary}
              autoCapitalize='none'
              autoCorrect={false}
            />
            {keyword ? (
              <TouchableOpacity
                onPress={handleClearKeyword}
                style={styles.clearButton}
              >
                <Ionicons
                  name='close-circle'
                  size={20}
                  color={Color.iconMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          {stagedBrands.length > 0 ? (
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
                  <TouchableOpacity
                    key={key}
                    style={styles.summaryChip}
                    onPress={() => handleRemoveStagedBrand(brand)}
                    activeOpacity={0.7}
                  >
                    <PretendardText
                      style={styles.summaryChipText}
                      weight='semibold'
                    >
                      {label}
                    </PretendardText>
                    <Ionicons name='close' size={14} color={Color.background} />
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
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleApply}
            activeOpacity={0.7}
          >
            <PretendardText style={styles.confirmButtonText} weight='semibold'>
              {confirmLabel}
            </PretendardText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Color.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // 닫기 버튼의 44pt 박스가 시트 우측 여백(20)을 먹고 들어가 아이콘이 안쪽으로 밀리지 않게 한다.
    marginRight: -10,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: Color.textPrimary,
  },
  resetText: {
    fontSize: 14,
    color: Color.textTertiary,
  },
  // HIG 최소 터치 타깃 44×44pt.
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSection: {
    flex: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryChips: {
    flexGrow: 0,
    marginTop: 8,
  },
  summaryChipsContent: {
    gap: AcgLayout.chipGap,
    paddingRight: 8,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.modal,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  summaryChipText: {
    fontSize: 13,
    lineHeight: 16,
    color: Color.background,
  },
  brandListContainer: {
    flex: 1,
    marginTop: 8,
  },
  brandList: {
    flex: 1,
  },
  brandListContent: {
    paddingBottom: 8,
  },
  skeletonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 12,
    backgroundColor: Color.background,
  },
  confirmButton: {
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default observer(FeedFilterSheetView);
