import { FC, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Feed from '@/model/feed/Feed';
import { toFeedSort, getFeedSortLabel } from '@/model/feed/FeedSort';
import BrandDirectory from '@/model/browse/BrandDirectory';
import { BrandRankData } from '@/model/search/BrandRankStore';
import { FeedBrandInterest } from '@/model/feed/FeedInterestProfile';
import { toBrandKey } from '@/model/store/BrandKey';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import SearchSkeletonView from '@/components/search/SearchSkeletonView';
import BrandRowView from '@/components/browse/BrandRowView';
import app from '@/model/app/App';

const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;
const SHEET_HEIGHT_RATIO = 0.85;

// 드래그 닫기 임계값 — 아래로 이만큼 끌거나(px) 이 속도 이상이면 닫는다.
const CLOSE_DRAG_THRESHOLD = 120;
const CLOSE_VELOCITY = 0.5;

const CONFIRM_LABEL = '확인';

interface Props {
  feed: Feed;
  visible: boolean;
  onClose: () => void;
}

// FD-3: 브랜드 전용 바텀시트. 정렬·카테고리는 상단 필터 바로 이동했고, 여기서는 브랜드만 다룬다.
// 브랜드 검색/목록(내부 스크롤) + 선택 요약 칩 + 초기화 + 하단 고정 `확인`으로 구성된다.
// 애니메이션/제스처는 gesture-handler + reanimated 기반(딤 페이드 + 시트 슬라이드 + 핸들바 드래그)이고,
// 브랜드 목록·검색은 BrandDirectory 모델을 재사용한다.
// 선택은 시트 안에서 스테이징되고 하단 `확인`으로 일괄 적용된다. 오버레이/핸들/뒤로가기 = 취소(스테이징 폐기).
const FeedFilterSheetView: FC<Props> = ({ feed, visible, onClose }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [brandDirectory] = useState(() => BrandDirectory.new(router));

  const sheetHeight = Dimensions.get('window').height * SHEET_HEIGHT_RATIO;
  // 시트가 화면 밖으로 완전히 내려가는 거리(초기/닫힘 translateY).
  const sheetOffscreen = sheetHeight + 100;

  const translateY = useSharedValue(sheetOffscreen);
  const dim = useSharedValue(0);

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

    // 슬라이드 인 + 딤 페이드 인.
    translateY.value = sheetOffscreen;
    dim.value = 0;
    translateY.value = withTiming(0, { duration: OPEN_DURATION });
    dim.value = withTiming(1, { duration: OPEN_DURATION });
  }, [visible, brandDirectory, translateY, dim, feed, sheetOffscreen]);

  // 취소: 스테이징을 폐기하고 닫는다(적용 브랜드 유지).
  const handleCancel = () => {
    onClose();
  };

  // 닫기 애니메이션 완료 후 실행할 JS 콜백(취소 경로 = 스테이징 폐기).
  const handleClosed = () => {
    onClose();
  };

  // 닫기: 시트를 화면 밖으로 내리고 딤을 페이드 아웃한 뒤 onClose(취소 경로)를 호출한다.
  const close = () => {
    dim.value = withTiming(0, { duration: CLOSE_DURATION });
    translateY.value = withTiming(
      sheetOffscreen,
      { duration: CLOSE_DURATION },
      finished => {
        if (finished) {
          runOnJS(handleClosed)();
        }
      }
    );
  };

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (
        event.translationY > CLOSE_DRAG_THRESHOLD ||
        event.velocityY > CLOSE_VELOCITY
      ) {
        dim.value = withTiming(0, { duration: CLOSE_DURATION });
        translateY.value = withTiming(
          sheetOffscreen,
          { duration: CLOSE_DURATION },
          finished => {
            if (finished) {
              runOnJS(handleClosed)();
            }
          }
        );

        return;
      }

      translateY.value = withSpring(0);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dimStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
  }));

  // FD-3 `확인`: 스테이징 브랜드를 원자 적용한 뒤 닫는다(변경 없으면 applyBrands가 no-op).
  const handleApply = () => {
    app.getAnalyticsManager()?.logClick('feed_filter_apply', {
      category: feed.getFilterCategory() ?? 'all',
      brand_count: stagedBrands.length,
      sort: getFeedSortLabel(toFeedSort(feed.getSort())),
    });
    feed.applyBrands(stagedBrands);
    close();
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
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType='none'
      onRequestClose={handleCancel}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Pressable style={styles.overlayRoot} onPress={handleCancel}>
          <Animated.View
            style={[styles.overlayDim, dimStyle]}
            pointerEvents='none'
          />
          <Animated.View style={sheetStyle}>
            <Pressable
              style={[styles.sheet, { height: sheetHeight }]}
              onPress={e => e.stopPropagation()}
            >
              {/* 키보드 회피: 브랜드 검색 포커스 시 목록·확인 버튼이 가려지지 않게 한다(배낭 담기 모달과 동일 패턴). */}
              <KeyboardAvoidingView
                style={styles.keyboardAvoider}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <GestureDetector gesture={panGesture}>
                  <View style={styles.handle}>
                    <View style={styles.handleBar} />
                  </View>
                </GestureDetector>

                <View style={styles.header}>
                  <PretendardText style={styles.title} weight='bold'>
                    브랜드
                  </PretendardText>
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
                        const key = toBrandKey(
                          brand.companyKorean,
                          brand.company
                        );
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
                            <Ionicons
                              name='close'
                              size={14}
                              color={Color.background}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                  <View style={styles.brandListContainer}>
                    {renderBrandList()}
                  </View>
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
                    <PretendardText
                      style={styles.confirmButtonText}
                      weight='semibold'
                    >
                      {confirmLabel}
                    </PretendardText>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Color.overlay,
  },
  sheet: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: 20,
  },
  keyboardAvoider: {
    flex: 1,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
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
    gap: 8,
    paddingRight: 8,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
