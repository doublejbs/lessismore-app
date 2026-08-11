import { FC } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Feed from '@/model/feed/Feed';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize, AcgShadow } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

const RANKING_LABEL = '인기 순위';

// FD-3: 피드 하단 플로팅 `인기 순위` 진입 버튼.
// 컨테이너는 pointerEvents='box-none'으로 버튼 외 영역의 피드 스크롤을 방해하지 않는다.
//
// 탭바 여유. 84로 올렸다가 되돌렸다 — 이 뷰의 부모(탭 씬)가 이미 플로팅 탭바만큼
// 위로 잘려 있어서, 탭바 높이를 여기서 또 더하면 버튼이 목록 한가운데까지 올라온다
// (2026-08-03 실기기 확인). 부모 하단 기준 이 값이면 탭바 위로 충분히 뜬다.
const RANKING_BUTTON_CLEARANCE = 20;

// 알약 높이. 레퍼런스의 하단 중앙 액센트 알약과 같은 크기다.
const PILL_HEIGHT = 48;

const ICON_SIZE = 20;

// 레퍼런스 이식(2026-08-11): 이 버튼이 탐색 탭의 **유일한 액센트 면**이다 —
// 라임 채움 + 잉크 글자·아이콘. 그림자도 화면에서 이 버튼에만 둔다(목록·컨트롤은 없음).
// 앱 공용 `FloatingPillButton`(흰/검 아웃라인)은 아직 이식하지 않은 화면들이 쓰므로 건드리지 않고,
// 이 화면만 자체 알약을 그린다.
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
      <TouchableOpacity
        style={styles.pill}
        onPress={handleGoToRanking}
        activeOpacity={0.85}
        accessibilityRole='button'
        accessibilityLabel={RANKING_LABEL}
      >
        <Ionicons name='trending-up' size={ICON_SIZE} color={Acg.ink} />
        <PretendardText style={styles.label} weight='semibold'>
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
    paddingHorizontal: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // 고정 높이 대신 최소 높이 — Dynamic Type에서 라벨이 잘리지 않게 한다.
    minHeight: PILL_HEIGHT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    // 높이가 커져도 알약을 유지한다.
    borderRadius: PILL_HEIGHT,
    backgroundColor: Acg.lime,
    boxShadow: AcgShadow.card,
  },
  label: {
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
});

export default observer(FeedRankingButtonView);
