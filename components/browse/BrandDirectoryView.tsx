import { FC } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import BrandDirectory from '@/model/browse/BrandDirectory';
import { BrandRankData } from '@/model/search/BrandRankStore';
import PretendardText from '../PretendardText';
import { Acg, AcgLayout, AcgType, Color, Radius } from '@/constants/DesignTokens';
import SearchSkeletonView from '../search/SearchSkeletonView';
import BrandRowView from './BrandRowView';
import app from '@/model/app/App';

interface Props {
  brandDirectory: BrandDirectory;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 네이티브 내비게이션 바 높이 — 고정(비스크롤) 상단 콘텐츠의 시작 위치 보정용.
const NATIVE_HEADER_HEIGHT = 44;

const BrandDirectoryView: FC<Props> = ({ brandDirectory }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const brands = brandDirectory.getBrands();
  const isLoading = brandDirectory.isLoading();
  const isEmpty = brandDirectory.isEmpty();
  const keyword = brandDirectory.getKeyword();

  const handleBack = () => {
    router.back();
  };

  const handleChangeKeyword = (text: string) => {
    brandDirectory.changeKeyword(text);
  };

  const handleClearKeyword = () => {
    brandDirectory.clearKeyword();
  };

  const handleBrandPress = (brand: BrandRankData) => {
    app.getAnalyticsManager()?.logClick('brand_directory_item');
    brandDirectory.goToBrandList(brand);
  };

  const renderItem = ({ item }: { item: BrandRankData }) => {
    return <BrandRowView brand={item} onPress={() => handleBrandPress(item)} />;
  };

  const renderContent = () => {
    if (isLoading && isEmpty) {
      return (
        <View style={styles.skeletonContainer}>
          <SearchSkeletonView count={10} />
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            브랜드가 없어요
          </PretendardText>
        </View>
      );
    }

    return (
      <FlatList
        data={brands}
        renderItem={renderItem}
        keyExtractor={(brand: BrandRankData) => brand.brandKey}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        // LG-1: 검색 인풋이 상단 고정 콘텐츠라 헤더 뒤로 흐를 수 없다 —
        // 투명 헤더(상태바+44pt) 아래에서 시작하도록 여백을 준다.
        IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
      ]}
    >
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '브랜드별 탐색',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='bold'>
            브랜드별 탐색
          </PretendardText>
        </View>
      )}
      <View style={styles.searchContainer}>
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
              <Ionicons name='close-circle' size={20} color={Color.iconMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
    minHeight: 48,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...AcgType.rowTitle,
    flex: 1,
    color: Color.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  searchInput: {
    // 단일행 입력이라 줄간은 싣지 않는다(안드로이드에서 커서가 어긋난다).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  skeletonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    textAlign: 'center',
  },
});

export default observer(BrandDirectoryView);
