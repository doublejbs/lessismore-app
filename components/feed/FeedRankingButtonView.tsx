import { FC } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidLayout, LiquidMotion } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

const RANKING_LABEL = '인기 순위';

// FD-3: 피드 하단 플로팅 `인기 순위` 진입 버튼.
// (구 중앙 `필터` 버튼은 상단 필터 바(FeedFilterBarView)로 대체되어 제거됨.)
// 컨테이너는 pointerEvents='box-none'으로 버튼 외 영역의 피드 스크롤을 방해하지 않는다.
//
// 탭바 여유. 84로 올렸다가 되돌렸다 — 이 뷰의 부모(탭 씬)가 이미 플로팅 탭바만큼
// 위로 잘려 있어서, 탭바 높이를 여기서 또 더하면 버튼이 카드 한가운데까지 올라온다
// (2026-08-03 실기기 확인). 부모 하단 기준 이 값이면 탭바 위로 충분히 뜬다.
const RANKING_BUTTON_CLEARANCE = 20;

const FeedRankingButtonView: FC<Props> = ({ feed }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      {/* 잉크 유리 알약(Liquid) — 이 화면만의 어두운 유리라 공용 프리미티브를 쓰지 않는다.
          (구세대 공용 `FloatingPillButton`은 마지막 소비처인 창고 플로팅 `장비 추가`가
          상단 크롬으로 올라가며 2026-08-11에 지워졌다.) */}
      <TouchableOpacity
        style={styles.pill}
        onPress={handleGoToRanking}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={RANKING_LABEL}
      >
        <BlurView tint='dark' intensity={30} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.pillFill]} />
        <Ionicons name='trending-up' size={17} color={Liquid.lime} />
        <PretendardText weight='semibold' style={styles.pillLabel}>
          {RANKING_LABEL}
        </PretendardText>
      </TouchableOpacity>
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
    paddingHorizontal: LiquidLayout.screenH,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 23,
    overflow: 'hidden',
    boxShadow: '0 10px 26px rgba(16,16,18,0.28)',
  },
  pillFill: {
    backgroundColor: 'rgba(16,16,18,0.88)',
  },
  pillLabel: {
    fontSize: 15,
    color: Liquid.surface,
  },
});

export default observer(FeedRankingButtonView);
