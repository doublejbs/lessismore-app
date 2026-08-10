import Comment from '@/model/reply/Comment';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import { LiquidLayout } from '@/constants/DesignTokens';
import ReplyDetailOriginalView from './ReplyDetailOriginalView';
import ReplyDetailCommentView from './ReplyDetailCommentView';
import ReplyDetailInputView from './ReplyDetailInputView';

interface Props {
  replyDetail: ReplyDetail;
  originalComment: Comment;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 직접 그린다.
const IS_IOS = Platform.OS === 'ios';

// 투명 네이티브 헤더 높이(상태바 제외). `contentInsetAdjustmentBehavior='automatic'`은
// 스크롤 뷰가 화면의 첫 자식일 때만 적용되는데, 지면 배경이 앞에 깔리면서 그 조건이 깨져
// 첫 항목이 헤더 뒤로 숨었다(2026-08-03 실기기 확인). 자동 인셋을 끄고 헤더 높이를 직접 비운다.
const NATIVE_HEADER_HEIGHT = LiquidLayout.navBar;

/**
 * RP-2 리뷰 상세(원 리뷰 + 답글) 화면 (Liquid Depth, 2026-08-11 이식).
 *
 * 원 리뷰는 **자기 종이 카드** 하나이고, 답글은 그 아래 **좌측을 들여쓴 카드 하나** 안에
 * 헤어라인으로 갈려 쌓인다 — 답글마다 면을 두면 화면이 카드 더미로 보이고, 들여쓰기가
 * 원 리뷰와의 종속 관계를 말한다.
 */
const ReplyDetailView = ({ replyDetail, originalComment }: Props) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const replies = replyDetail.getReplies();

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다. 원 리뷰에 달린 **답글** 화면이라 타이틀은 `답글`이다 —
          앱 카피가 이 관계를 답글로 부르므로(RP-2) 바에서도 같은 말을 쓴다. */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '답글',
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
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
        ref={scrollViewRef}
        contentInsetAdjustmentBehavior='never'
        showsVerticalScrollIndicator={false}
      >
        <ReplyDetailOriginalView
          comment={originalComment}
          replyDetail={replyDetail}
        />

        {replies.length > 0 ? (
          <View style={styles.repliesIndent}>
            {/* 답글이 자기 여백을 들고 있어 카드 패딩은 0이다. `clip`으로 첫·마지막 답글이
                카드 모서리 밖으로 새지 않게 한다. */}
            <LiquidCard tone='paper' padding={0} clip>
              {replies.map((reply, index) => (
                <ReplyDetailCommentView
                  key={reply.id}
                  comment={reply}
                  replyDetail={replyDetail}
                  divider={index > 0}
                />
              ))}
            </LiquidCard>
          </View>
        ) : null}
      </ScrollView>
      <ReplyDetailInputView
        replyDetail={replyDetail}
        scrollViewRef={scrollViewRef as React.RefObject<ScrollView>}
      />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 6,
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: 24,
  },
  // 답글 묶음은 좌측을 들여 원 리뷰에 딸린 것임을 드러낸다.
  repliesIndent: {
    marginTop: LiquidLayout.listGap,
    marginLeft: LiquidLayout.screenH,
  },
});

export default observer(ReplyDetailView);
