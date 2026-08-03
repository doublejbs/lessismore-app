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
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import AcgScreenBackground from '@/components/acg/AcgScreenBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  replyDetail: ReplyDetail;
  originalComment: any;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

// 투명 네이티브 헤더 높이(상태바 제외). `contentInsetAdjustmentBehavior='automatic'`은
// 스크롤 뷰가 화면의 첫 자식일 때만 적용되는데, 지면 배경(AcgScreenBackground)이 앞에
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
      {/* 상세 화면은 지형 마크 없이 지면 + 그레인만 쓴다(ACG). */}
      <AcgScreenBackground terrain={false} />
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다. 원 리뷰에 달린 댓글(답글) 화면이라 타이틀은 '댓글'. */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '댓글',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
            <Ionicons name='chevron-back-outline' size={24} color={Acg.ink} />
          </TouchableOpacity>
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
  container: {
    flex: 1,
    // 지면은 AcgScreenBackground가 깐다.
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  scrollView: {
    flex: 1,
  },
  // 원 리뷰 + 답글이 각자 종이 면이라 홈 리스트와 같은 8px 간격을 준다.
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: AcgLayout.screenH,
    gap: 8,
  },
});

export default observer(ReplyDetailView);
