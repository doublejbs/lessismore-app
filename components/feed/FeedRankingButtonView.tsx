import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import FloatingPillButton from '@/components/FloatingPillButton';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

const RANKING_LABEL = '인기 순위';

// FD-3: 피드 하단 플로팅 `인기 순위` 진입 버튼.
// (구 중앙 `필터` 버튼은 상단 필터 바(FeedFilterBarView)로 대체되어 제거됨.)
// 컨테이너는 pointerEvents='box-none'으로 버튼 외 영역의 피드 스크롤을 방해하지 않는다.
// 플로팅 탭바(약 64pt) + 여유. 이 값만큼 띄워야 버튼이 탭바 위에 온전히 놓인다.
const RANKING_BUTTON_CLEARANCE = 84;

const FeedRankingButtonView: FC<Props> = ({ feed }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // iOS는 피드가 탭바 뒤로 흐르는(edge-to-edge) 화면 하단 기준이라 화면 하단이 기준점이다.
  // ACG 플로팅 탭바는 화면에서 더 떠 있어 20pt로는 버튼이 탭바와 겹치고 카드도 가렸다
  // (2026-08-03 실기기 확인) — 탭바 높이만큼 더 올린다.
  const bottom = Platform.select({
    ios: insets.bottom + RANKING_BUTTON_CLEARANCE,
    android: RANKING_BUTTON_CLEARANCE,
    default: 80,
  });

  // SR-4: 현재 선택된 카테고리를 순위 화면으로 승계한다(그룹 카테고리 기준).
  const handleGoToRanking = () => {
    app.getAnalyticsManager()?.logClick('feed_ranking');

    const category = feed.getFilterCategory();

    if (category) {
      router.push(`/popular-ranking?category=${category}`);
    } else {
      router.push('/popular-ranking');
    }
  };

  return (
    <View style={[styles.container, { bottom }]} pointerEvents='box-none'>
      <FloatingPillButton
        label={RANKING_LABEL}
        onPress={handleGoToRanking}
        variant='secondary'
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});

export default observer(FeedRankingButtonView);
