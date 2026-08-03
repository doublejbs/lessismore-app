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
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import AcgScreenBackground from '@/components/acg/AcgScreenBackground';
import AcgHighlightText from '@/components/acg/AcgHighlightText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '../PretendardText';
import ReplyInputButtonView from './ReplyInputButtonView';
import { observer } from 'mobx-react-lite';
import ReplyItemView from './ReplyItemView';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

// 투명 네이티브 헤더 높이(상태바 제외). `contentInsetAdjustmentBehavior='automatic'`은
// 스크롤 뷰가 화면의 첫 자식일 때만 적용되는데, 지면 배경(AcgScreenBackground)이 앞에
// 깔리면서 그 조건이 깨져 첫 항목이 헤더 뒤로 숨었다(2026-08-03 실기기 확인).
// 자동 인셋을 끄고 헤더 높이를 직접 비운다.
const NATIVE_HEADER_HEIGHT = 44;

// 섹션 제목 크기(ACG) — 홈·장비 상세와 같은 18px/700.
const SECTION_TITLE_SIZE = 18;

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
      <AcgScreenBackground />
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
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
            <PretendardText weight='semibold' style={styles.titleText}>
              리뷰
            </PretendardText>
            <View style={styles.placeholder} />
          </View>
        </View>
      )}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
        contentInsetAdjustmentBehavior='never'
        // 리뷰가 없을 땐 스크롤을 끈다 — flexGrow(중앙 정렬용)와 헤더 자동 인셋이 겹쳐
        // 빈 화면인데도 헤더 높이만큼 스크롤이 생기는 것을 막는다.
        scrollEnabled={hasComments}
      >
        <View style={styles.replyHeader}>
          {/* 형광펜은 화면당 한 곳에만 — 이 화면의 주 섹션이다(ACG). */}
          <AcgHighlightText fontSize={SECTION_TITLE_SIZE}>
            <PretendardText weight='bold' style={styles.replyHeaderText}>
              리뷰
            </PretendardText>
          </AcgHighlightText>
        </View>
        {!hasComments ? (
          // 리뷰가 없을 때 빈 여백 대신 안내를 남은 공간 중앙에 표시한다.
          <View style={styles.emptyState}>
            <Ionicons name='star-outline' size={40} color={Acg.line2} />
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
    // 지면은 AcgScreenBackground가 깐다.
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: AcgLayout.screenH,
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
    color: Acg.ink,
  },
  placeholder: {
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // 홈 탭 리스트와 같은 문법 — 행이 각자 종이 면을 갖고 8px 간격으로 놓인다.
  content: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: AcgLayout.screenH,
    gap: 8,
  },
  replyHeader: {
    paddingTop: 20,
    paddingHorizontal: AcgLayout.screenH,
  },
  // 지면 위 제목이라 본문보다 한 단계 낮은 색이다(장비 상세 섹션 제목과 동일).
  replyHeaderText: {
    fontSize: SECTION_TITLE_SIZE,
    color: Acg.textTertiary,
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
    color: Acg.ink,
  },
  emptyDesc: {
    fontSize: 14,
    color: Acg.textSecondary,
  },
});

export default observer(ReplyView);
