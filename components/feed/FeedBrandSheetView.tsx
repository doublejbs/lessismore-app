import { FC, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BrandDirectory from '@/model/browse/BrandDirectory';
import { BrandRankData } from '@/model/search/BrandRankStore';
import { FeedBrandInterest } from '@/model/feed/FeedInterestProfile';
import PretendardText from '@/components/PretendardText';
import SearchSkeletonView from '@/components/search/SearchSkeletonView';
import BrandRowView from '@/components/browse/BrandRowView';

const SHEET_SLIDE_DISTANCE = 600;
const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;
const SHEET_HEIGHT_RATIO = 0.68;

interface Props {
  visible: boolean;
  selectedBrand: FeedBrandInterest | null;
  onClose: () => void;
  onSelect: (brand: FeedBrandInterest | null) => void;
}

// FD-3: 브랜드 선택 바텀시트. BrowseSortButtonView의 애니메이션 패턴(딤 페이드 + 시트 슬라이드 + 핸들바)을 미러링한다.
// 브랜드 목록·검색 로직은 BrandDirectory 모델을 재사용하되, 행 탭 시 화면 이동이 아니라 선택 콜백을 호출한다.
const FeedBrandSheetView: FC<Props> = ({
  visible,
  selectedBrand,
  onClose,
  onSelect,
}) => {
  const router = useRouter();
  const [brandDirectory] = useState(() => BrandDirectory.new(router));
  const progress = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  const brands = brandDirectory.getBrands();
  const isLoading = brandDirectory.isLoading();
  const isEmpty = brandDirectory.isEmpty();
  const keyword = brandDirectory.getKeyword();
  const sheetHeight = Dimensions.get('window').height * SHEET_HEIGHT_RATIO;

  useEffect(() => {
    if (!visible) {
      return;
    }

    brandDirectory.initialize();
    isClosing.current = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, brandDirectory, progress]);

  const runClose = () => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;

    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      isClosing.current = false;
      onClose();
    });
  };

  const handleClose = () => {
    runClose();
  };

  const handleChangeKeyword = (text: string) => {
    brandDirectory.changeKeyword(text);
  };

  const handleClearKeyword = () => {
    brandDirectory.clearKeyword();
  };

  const handleSelectBrand = (brand: BrandRankData) => {
    onSelect({
      companyKorean: brand.companyKorean,
      company: brand.company,
    });
    runClose();
  };

  const handleClearSelection = () => {
    onSelect(null);
    runClose();
  };

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_SLIDE_DISTANCE, 0],
  });

  const renderList = () => {
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
        style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {brands.map(brand => (
          <BrandRowView
            key={brand.brandKey}
            brand={brand}
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
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlayRoot} onPress={handleClose}>
        <Animated.View
          style={[styles.overlayDim, { opacity: progress }]}
          pointerEvents='none'
        />
        <Animated.View
          style={{ transform: [{ translateY: sheetTranslateY }] }}
        >
          <Pressable
            style={[styles.sheet, { height: sheetHeight }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.handle}>
              <View style={styles.handleBar} />
            </View>

            <PretendardText style={styles.title} weight='bold'>
              브랜드
            </PretendardText>

            <View style={styles.searchInputWrapper}>
              <TextInput
                style={styles.searchInput}
                value={keyword}
                onChangeText={handleChangeKeyword}
                placeholder='브랜드명을 검색해보세요'
                placeholderTextColor='#999'
                autoCapitalize='none'
                autoCorrect={false}
              />
              {keyword ? (
                <TouchableOpacity
                  onPress={handleClearKeyword}
                  style={styles.clearButton}
                >
                  <Ionicons name='close-circle' size={20} color='#B0B8C1' />
                </TouchableOpacity>
              ) : null}
            </View>

            {selectedBrand ? (
              <TouchableOpacity
                style={styles.clearSelection}
                onPress={handleClearSelection}
                activeOpacity={0.7}
              >
                <PretendardText
                  style={styles.clearSelectionText}
                  weight='semibold'
                >
                  선택 해제
                </PretendardText>
              </TouchableOpacity>
            ) : null}

            <View style={styles.listContainer}>{renderList()}</View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: '#0A090B',
    paddingVertical: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
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
  clearSelection: {
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  clearSelectionText: {
    fontSize: 14,
    color: '#555',
  },
  listContainer: {
    flex: 1,
    marginTop: 4,
  },
  list: {
    flex: 1,
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
    color: '#888',
    textAlign: 'center',
  },
});

export default observer(FeedBrandSheetView);
