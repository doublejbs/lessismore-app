import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import FloatingPillButton from '@/components/FloatingPillButton';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

const RANKING_LABEL = '인기 순위';

// 탭바 위 오프셋. Android는 0이면 버튼이 탭바에 붙어 마지막 카드를 가리므로 여백을 준다.
const BOTTOM_OFFSET = Platform.select({
  ios: 80,
  android: 20,
  default: 80,
});

// FD-3: 피드 하단 플로팅 `인기 순위` 진입 버튼.
// (구 중앙 `필터` 버튼은 상단 필터 바(FeedFilterBarView)로 대체되어 제거됨.)
// 컨테이너는 pointerEvents='box-none'으로 버튼 외 영역의 피드 스크롤을 방해하지 않는다.
const FeedRankingButtonView: FC<Props> = ({ feed }) => {
  const router = useRouter();

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
    <View style={styles.container} pointerEvents='box-none'>
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
    bottom: BOTTOM_OFFSET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});

export default observer(FeedRankingButtonView);
