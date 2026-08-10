import { FC } from 'react';
import { View, StyleSheet, FlatList, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Stack, useRouter } from 'expo-router';
import BrandDirectory from '@/model/browse/BrandDirectory';
import { BrandRankData } from '@/model/search/BrandRankStore';
import PretendardText from '@/components/PretendardText';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import LiquidSearchField from '@/components/liquid/LiquidSearchField';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
import BrandRowSkeletonView from './BrandRowSkeletonView';
import BrandRowView from './BrandRowView';
import app from '@/model/app/App';

interface Props {
  brandDirectory: BrandDirectory;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 직접 그린다.
const IS_IOS = Platform.OS === 'ios';
// 크롬 아래 제목 블록이 시작하는 여백(창고 WH-1과 같은 값).
const HEADER_TOP_GAP = 6;

/**
 * SR-8 브랜드 디렉토리 (Liquid Depth, 2026-08-11 이식).
 *
 * 지면은 지형 없이 `canvas` + 우상단 라임 글로우다 — 훑어 찾는 목록이라 산세를 깔지 않는다
 * (창고와 같은 판단). 제목 블록이 화면 대상을 들고, 그 아래 **유리 검색 필드**가 고정으로
 * 앉으며, 브랜드 행은 각자 종이 카드로 놓인다. 라임 면은 두지 않는다 — 이 화면에는 담기 같은
 * 주 액션이 없고 행 선택이 곧 이동이다.
 */
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

  // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions). 원인마다 다음 걸음이 다르다.
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

  const renderContent = () => {
    if (isLoading && isEmpty) {
      // 스피너 대신 도착할 목록과 같은 골격을 그린다.
      return (
        <View style={styles.skeletonContainer}>
          <BrandRowSkeletonView count={10} />
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
      <FlatList
        data={brands}
        renderItem={renderItem}
        keyExtractor={(brand: BrandRankData) => brand.brandKey}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // 제목 블록·검색 필드가 상단에 고정돼 있어 자동 인셋을 쓰지 않는다(창고와 같은 구조).
        contentInsetAdjustmentBehavior='never'
        // 검색 필드가 위에 고정돼 있어 키보드가 올라온 채로 행을 누르는 흐름이 있다.
        keyboardShouldPersistTaps='handled'
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
          **타이틀은 비운다** — 화면 대상은 본문 제목 블록이 든다(창고와 같은 처리). */}
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
        <View style={styles.titleBlock}>
          <PretendardText weight='bold' style={styles.title} numberOfLines={1}>
            브랜드별 탐색
          </PretendardText>
          {/* 지금 목록에 보이는 브랜드 수다(검색어를 넣으면 함께 줄어든다) — 아래 목록과
              같은 사실을 말한다. 로딩 중에는 세지 못한 값을 단정하지 않는다(스켈레톤과 어긋난다). */}
          {!isEmpty && !isLoading ? (
            <PretendardText weight='medium' style={styles.summary}>
              {`${brands.length}개`}
            </PretendardText>
          ) : null}
        </View>
        <LiquidSearchField
          value={keyword}
          onChangeText={handleChangeKeyword}
          onClear={handleClearKeyword}
          placeholder='브랜드명을 검색해보세요'
          accessibilityLabel='브랜드명 검색'
        />
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
    gap: 14,
  },
  titleBlock: {
    flexShrink: 1,
  },
  title: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  summary: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: Liquid.inkTertiary,
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

export default observer(BrandDirectoryView);
