import Reply from '@/model/reply/Reply';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Color } from '@/constants/DesignTokens';
import PretendardText from '../PretendardText';
import ReplyInputButtonView from './ReplyInputButtonView';
import { observer } from 'mobx-react-lite';
import ReplyItemView from './ReplyItemView';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

const ReplyView = ({ reply }: { reply: Reply }) => {
  const router = useRouter();
  const comments = reply.getComments();
  const hasComments = comments.length > 0;

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '리뷰',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
              <Ionicons
                name='chevron-back'
                size={24}
                color={Color.textPrimary}
              />
            </TouchableOpacity>
            <PretendardText weight='semibold' style={styles.titleText}>
              리뷰
            </PretendardText>
            <View style={styles.placeholder} />
          </View>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
        contentInsetAdjustmentBehavior='automatic'
        // 리뷰가 없을 땐 스크롤을 끈다 — flexGrow(중앙 정렬용)와 헤더 자동 인셋이 겹쳐
        // 빈 화면인데도 헤더 높이만큼 스크롤이 생기는 것을 막는다.
        scrollEnabled={hasComments}
      >
        <View style={styles.replyHeader}>
          <PretendardText weight='semibold' style={styles.replyHeaderText}>
            리뷰
          </PretendardText>
        </View>
        {!hasComments ? (
          // 리뷰가 없을 때 빈 여백 대신 안내를 남은 공간 중앙에 표시한다.
          <View style={styles.emptyState}>
            <Ionicons
              name='star-outline'
              size={40}
              color={Color.chipBorder}
            />
            <PretendardText weight='semibold' style={styles.emptyTitle}>
              아직 등록된 리뷰가 없어요
            </PretendardText>
            <PretendardText style={styles.emptyDesc}>
              첫 리뷰를 남겨보세요
            </PretendardText>
          </View>
        ) : (
          <View style={styles.content}>
            {comments.map(comment => (
              <ReplyItemView
                key={comment.id}
                gearId={reply.getGearId()}
                comment={comment}
                reply={reply}
              />
            ))}
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
    backgroundColor: Color.background,
  },
  header: {
    backgroundColor: Color.background,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleText: {
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
    color: Color.textPrimary,
  },
  placeholder: {
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  replyHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  replyHeaderText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  emptyDesc: {
    fontSize: 14,
    color: Color.textSecondary,
  },
});

export default observer(ReplyView);
