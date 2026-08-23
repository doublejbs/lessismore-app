import ReplyDetail from '@/model/reply/ReplyDetail';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import ReplyDetailOriginalView from './ReplyDetailOriginalView';
import ReplyDetailCommentView from './ReplyDetailCommentView';
import ReplyDetailInputView from './ReplyDetailInputView';
import { useRef } from 'react';
import { Acg, AcgLayout, Spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';

interface Props {
  replyDetail: ReplyDetail;
  originalComment: any;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

// 투명 네이티브 헤더 높이(상태바 제외). `contentInsetAdjustmentBehavior='automatic'`은
// 스크롤 뷰가 화면의 첫 자식일 때만 적용되는데, 지면 배경(`ground`)이 앞에
// 깔리면서 그 조건이 깨져 첫 항목이 헤더 뒤로 숨었다(2026-08-03 실기기 확인).
// 자동 인셋을 끄고 헤더 높이를 직접 비운다.
const NATIVE_HEADER_HEIGHT = 44;

const ReplyDetailView = ({ replyDetail, originalComment }: Props) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.ground} />
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다. 원 리뷰에 달린 댓글(답글) 화면이라 타이틀은 '댓글'. */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: app.getL10n().t('reply.detailTitle'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handlePressBack}
            activeOpacity={0.7}
            style={styles.backButton}
            accessibilityLabel={app.getL10n().t('reply.back')}
            accessibilityRole='button'
          >
            <Ionicons name='chevron-back-outline' size={24} color={Acg.ink} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          IS_IOS && {
            paddingTop: insets.top + NATIVE_HEADER_HEIGHT + Spacing.item,
          },
        ]}
        ref={scrollViewRef}
        contentInsetAdjustmentBehavior='never'
      >
        <ReplyDetailOriginalView
          comment={originalComment}
          replyDetail={replyDetail}
        />
        {replyDetail.getReplies().map(reply => (
          <ReplyDetailCommentView
            key={reply.id}
            comment={reply}
            replyDetail={replyDetail}
          />
        ))}
      </ScrollView>
      <ReplyDetailInputView
        replyDetail={replyDetail}
        scrollViewRef={scrollViewRef as React.RefObject<ScrollView>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
  },
  container: {
    flex: 1,
    // 지면은 아래 `ground`가 깐다.
    backgroundColor: 'transparent',
  },
  // 화면 좌우 정렬선은 콘텐츠와 같은 값이다 — 바만 안쪽으로 들어가면 화면이 흔들려 보인다.
  header: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
  // 아이콘 전용 컨트롤 — HIG 최소 터치 타깃 44×44pt.
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  scrollView: {
    flex: 1,
  },
  // 원 리뷰 + 답글이 각자 면이라 홈 리스트와 같은 8px 간격을 준다.
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 8,
  },
});

export default observer(ReplyDetailView);
