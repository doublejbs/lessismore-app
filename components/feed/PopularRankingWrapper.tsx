import { FC, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import { Color } from '@/constants/DesignTokens';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import SearchTopKeywordsView from '@/components/search/SearchTopKeywordsView';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 네이티브 내비게이션 바 높이 — 고정(비스크롤) 상단 콘텐츠의 시작 위치 보정용.
const NATIVE_HEADER_HEIGHT = 44;
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

// FD-3 / SR-4: 인기 장비 순위 전용 화면(3단 래퍼).
// SearchTopKeywordsView가 요구하는 의존성(SearchWarehouse/Bag)을 1회 생성해 주입하고,
// 뒤로가기 헤더(`인기 장비 순위`)를 얹는다. 내부 타이틀은 헤더와 중복되므로 감춘다.
const PopularRankingWrapper: FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // SR-4: 피드에서 승계한 진입 카테고리(그룹 GearFilter 값). 없으면 전체로 진입.
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());

  const handleBack = () => {
    router.back();
  };

  return (
    <Layout paddingHorizontal={0} edges={IS_IOS ? IOS_EDGES : undefined}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '인기 장비 순위',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole='button'
            accessibilityLabel='뒤로 가기'
          >
            <Ionicons
              name='chevron-back'
              size={24}
              color={Color.textPrimary}
            />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='bold'>
            인기 장비 순위
          </PretendardText>
        </View>
      )}
      <View
        style={[
          styles.content,
          // LG-1: 카테고리 칩 행이 상단 고정 콘텐츠라 헤더 뒤로 흐를 수 없다 —
          // 투명 헤더(상태바+44pt) 아래에서 시작하도록 여백을 준다.
          IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
      >
        <SearchTopKeywordsView
          searchWarehouse={searchWarehouse}
          bag={bag}
          showTitle={false}
          initialCategory={category}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
  },
  // HIG 최소 터치 타깃 44×44pt. 아이콘은 좌측 정렬이라 화면 가장자리 여백은 그대로 유지된다.
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    color: Color.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default observer(PopularRankingWrapper);
