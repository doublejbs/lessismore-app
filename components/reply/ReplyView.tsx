import Reply from '@/model/reply/Reply';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
import ReplyInputButtonView from './ReplyInputButtonView';
import ReplyItemView from './ReplyItemView';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 직접 그린다.
const IS_IOS = Platform.OS === 'ios';

// 투명 네이티브 헤더 높이(상태바 제외). `contentInsetAdjustmentBehavior='automatic'`은
// 스크롤 뷰가 화면의 첫 자식일 때만 적용되는데, 지면 배경이 앞에 깔리면서 그 조건이 깨져
// 첫 항목이 헤더 뒤로 숨었다(2026-08-03 실기기 확인). 자동 인셋을 끄고 헤더 높이를 직접 비운다.
const NATIVE_HEADER_HEIGHT = LiquidLayout.navBar;

/**
 * RP-3 장비 리뷰 목록 화면 (Liquid Depth, 2026-08-11 이식).
 *
 * 화면 대상은 제목 블록(`리뷰`)이 들고, 리뷰는 **흰 카드 하나** 안에 헤어라인으로
 * 갈려 쌓인다(창고 목록과 같은 문법). 하단 입력 바는 지면 위에 뜬 유리 필드다 — 라임 면은
 * 두지 않는다: 이 화면의 주 액션은 리뷰 쓰기 하나이고, 그 자리는 시트 안 `확인`이 맡는다.
 */
const ReplyView = ({ reply }: { reply: Reply }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const comments = reply.getComments();
  const hasComments = comments.length > 0;

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
          화면 제목은 콘텐츠 안 제목 블록이 맡는다 — 네이티브 타이틀까지 두면 `리뷰`가
          100pt 안에 두 번 나온다(2026-08-04 시뮬레이터 확인). */}
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
            onPress={handlePressBack}
            accessibilityLabel='뒤로가기'
          />
        </View>
      )}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
        contentInsetAdjustmentBehavior='never'
        showsVerticalScrollIndicator={false}
        // 리뷰가 없을 땐 스크롤을 끈다 — flexGrow(중앙 정렬용)와 헤더 인셋이 겹쳐
        // 빈 화면인데도 헤더 높이만큼 스크롤이 생기는 것을 막는다.
        scrollEnabled={hasComments}
      >
        {/* 제목 아래 개수 줄을 두지 않는다 — 목록이 첫 페이지(20건)만 로드하므로(RP-3)
            여기서 셀 수 있는 값은 총 리뷰 수가 아니고, 장비 상세가 요약 문서로 보여 주는
            `리뷰 n`과 갈린다. 총계를 말할 수 있게 되면(페이지네이션) 그때 붙인다. */}
        <View style={styles.titleBlock}>
          <PretendardText weight='bold' style={styles.title}>
            리뷰
          </PretendardText>
        </View>

        {!hasComments ? (
          // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions).
          <View style={styles.emptyState}>
            <PretendardText weight='bold' style={styles.emptyTitle}>
              아직 등록된 리뷰가 없어요
            </PretendardText>
            <PretendardText style={styles.emptyText}>
              첫 리뷰를 남겨볼까요?
            </PretendardText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {/* 항목이 자기 여백을 들고 있어 카드 패딩은 0이다. `clip`으로 첫·마지막 항목이
                카드 모서리 밖으로 새지 않게 한다. */}
            <LiquidCard tone='paper' padding={0} clip>
              {comments.map((comment, index) => (
                <ReplyItemView
                  key={comment.id}
                  gearId={reply.getGearId()}
                  comment={comment}
                  reply={reply}
                  divider={index > 0}
                />
              ))}
            </LiquidCard>
          </View>
        )}
      </ScrollView>
      <ReplyInputButtonView reply={reply} />
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  titleBlock: {
    paddingTop: 6,
    paddingHorizontal: LiquidLayout.screenH,
  },
  title: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  listContainer: {
    paddingTop: 16,
    paddingHorizontal: LiquidLayout.screenH,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: LiquidLayout.screenH,
    paddingVertical: 80,
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

export default observer(ReplyView);
