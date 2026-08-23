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
import { Acg, AcgLayout, AcgType, Spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '../PretendardText';
import ReplyInputButtonView from './ReplyInputButtonView';
import { observer } from 'mobx-react-lite';
import ReplyItemView from './ReplyItemView';
import app from '@/model/app/App';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

// 투명 네이티브 헤더 높이(상태바 제외). `contentInsetAdjustmentBehavior='automatic'`은
// 스크롤 뷰가 화면의 첫 자식일 때만 적용되는데, 지면 배경(`ground`)이 앞에
// 깔리면서 그 조건이 깨져 첫 항목이 헤더 뒤로 숨었다(2026-08-03 실기기 확인).
// 자동 인셋을 끄고 헤더 높이를 직접 비운다.
const NATIVE_HEADER_HEIGHT = 44;

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
      <View style={styles.ground} />
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          // 화면 제목은 콘텐츠 안 큰 제목이 맡는다 — 네이티브 타이틀까지 두면 `리뷰`가
          // 100pt 안에 두 번 나온다(2026-08-04 시뮬레이터 확인).
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {/* RP-7: 바에는 back만 둔다 — 헤더 타이틀과 콘텐츠 큰 제목이 둘 다 `리뷰`라
          한 화면에 같은 낱말이 두 번 나왔다(iOS는 이미 headerTitle이 비어 있다). */}
      {!IS_IOS && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={handlePressBack}
              activeOpacity={0.7}
              style={styles.backButton}
              accessibilityLabel={app.getL10n().t('reply.back')}
              accessibilityRole='button'
            >
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          IS_IOS && {
            paddingTop: insets.top + NATIVE_HEADER_HEIGHT + Spacing.item,
          },
        ]}
        contentInsetAdjustmentBehavior='never'
        // 리뷰가 없을 땐 스크롤을 끈다 — flexGrow(중앙 정렬용)와 헤더 자동 인셋이 겹쳐
        // 빈 화면인데도 헤더 높이만큼 스크롤이 생기는 것을 막는다.
        scrollEnabled={hasComments}
      >
        <View style={styles.replyHeader}>
          {/* 형광펜 띠를 걷었다(2026-08-11) — 라임은 화면당 하나이고, 그 하나는 눌러야 하는
              면의 몫이다. RP-7: 이 화면의 제목이므로 섹션 단(18)이 아니라 화면 제목 단(22)이다. */}
          <PretendardText weight='semibold' style={styles.replyHeaderText}>
            {app.getL10n().t('gearDetail.reviews')}
          </PretendardText>
        </View>
        {!hasComments ? (
          // 리뷰가 없을 때 빈 여백 대신 안내를 남은 공간 중앙에 표시한다.
          <View style={styles.emptyState}>
            <Ionicons name='star-outline' size={40} color={Acg.hairline} />
            <PretendardText weight='semibold' style={styles.emptyTitle}>
              {app.getL10n().t('reply.noReviews')}
            </PretendardText>
            <PretendardText style={styles.emptyDesc}>
              {app.getL10n().t('reply.firstReviewPrompt')}
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
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: AcgLayout.screenPadding,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  // 아이콘 전용 컨트롤 — HIG 최소 터치 타깃 44×44pt.
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // 홈 탭 리스트와 같은 문법 — 행이 각자 면을 갖고 8px 간격으로 놓인다.
  content: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 8,
  },
  replyHeader: {
    paddingTop: 20,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  replyHeaderText: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  // 빈 상태는 배낭 탭과 같은 문법 — 제목 16 잉크 + 부제 14 뮤트.
  emptyTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  emptyDesc: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
});

export default observer(ReplyView);
