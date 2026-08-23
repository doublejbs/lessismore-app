import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Feed from '@/model/feed/Feed';
import FloatingPillButton from '@/components/FloatingPillButton';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

// FD-3: 피드 하단 플로팅 `인기 순위` 진입 버튼.
// 컨테이너는 pointerEvents='box-none'으로 버튼 외 영역의 피드 스크롤을 방해하지 않는다.
//
// 탭바 여유. 84로 올렸다가 되돌렸다 — 이 뷰의 부모(탭 씬)가 이미 플로팅 탭바만큼
// 위로 잘려 있어서, 탭바 높이를 여기서 또 더하면 버튼이 목록 한가운데까지 올라온다
// (2026-08-03 실기기 확인). 부모 하단 기준 이 값이면 탭바 위로 충분히 뜬다.
const RANKING_BUTTON_CLEARANCE = 20;

const ICON_SIZE = 20;

// 레퍼런스 이식(2026-08-11): 이 버튼이 탐색 탭의 **유일한 액센트 면**이다 —
// 라임 채움 + 잉크 글자·아이콘. 그림자도 화면에서 이 버튼에만 둔다(목록·컨트롤은 없음).
// 자체 알약을 그리던 것을 공용 `FloatingPillButton`로 되돌렸다 — 그 컴포넌트의 주 액션이
// 같은 라임 문법이 되면서 두 벌로 둘 이유가 사라졌다.
const FeedRankingButtonView: FC<Props> = ({ feed }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rankingLabel = app.getL10n().t('feed.ranking');

  // iOS는 피드가 탭바 뒤로 흐르는(edge-to-edge) 화면이라 홈 인디케이터만큼 더 띄운다.
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
        label={rankingLabel}
        onPress={handleGoToRanking}
        leadingIcon={
          <Ionicons name='trending-up' size={ICON_SIZE} color={Acg.ink} />
        }
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
