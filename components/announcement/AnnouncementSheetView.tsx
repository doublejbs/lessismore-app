import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import LiquidBottomSheet from '@/components/liquid/LiquidBottomSheet';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidSheetModal from '@/components/liquid/LiquidSheetModal';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidType,
} from '@/constants/DesignTokens';

// http(s) 링크 판별 — 이 경우만 외부 브라우저로 연다(AN-3).
const EXTERNAL_LINK_PATTERN = /^https?:\/\//i;

// 메시지가 길면 시트 안에서 스크롤된다(AN-2 — 레이아웃이 깨지지 않게).
const MESSAGE_MAX_HEIGHT = 320;

/**
 * 인앱 공지 바텀 시트 (Liquid Depth, AN-2/AN-3/AN-4).
 *
 * 잉크 막 위로 유리 시트(`LiquidBottomSheet`)가 올라온다 — 로그인·닉네임 편집 시트와 같은
 * 면이라 RN `Modal` 기반 시트가 앱 안에서 한 가지 형태로 읽힌다. 막·슬라이드·스와이프
 * 닫기는 `LiquidSheetModal`이 든다(이 파일에 있던 Animated·PanResponder를 옮겼다).
 * 그 전까지 여기 작성돼 있던 slide-down/fade-out은 `visible`이 꺼지는 순간 Modal이
 * 언마운트돼 **한 번도 재생되지 않았다** — 프리미티브가 마운트를 붙잡아 이제 내려간다.
 *
 * **위계를 뒤집어 놓았다**(2026-08-11 이식): 이식 전에는 닫기 두 개가 큰 회색 채움 버튼이고
 * 정작 이동(`자세히 보기`)이 본문 안 작은 밑줄 링크였다. 지금은 이동이 잉크 알약(주 액션
 * 하나)이고 닫기 둘은 글자 버튼이다 — 무게가 하는 일의 크기를 따라간다.
 *
 * 전역 1곳(app/_layout.tsx 최상위)에서 렌더한다.
 */
const AnnouncementSheetView = () => {
  // 훅은 모두 컴포넌트 최상단에서 무조건 같은 순서로 호출한다(조건부 훅 금지).
  // 매니저 접근·표시 판정 같은 분기는 훅을 전부 부른 뒤로 미룬다.
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const manager = app.getAnnouncementManager();
  const forceUpdateManager = app.getForceUpdateManager();
  const featurePopupManager = app.getFeaturePopupManager();

  const shouldShow = manager?.shouldShow() ?? false;
  const needsUpdate = forceUpdateManager?.getNeedsUpdate() ?? false;
  const featurePopupVisible = featurePopupManager?.shouldShow() ?? false;

  // 강제 업데이트 게이트(APP-7)가 떠 있거나 신기능 팝업(FP)이 뜰 조건이면 공지 시트를 띄우지 않는다(FP-6 우선순위: 게이트 > FP > 공지).
  // 게이트는 일반 absolute View라 Modal이 그 위로 뜨므로, 표시 조건에서 배제해 게이트를 최상위로 유지한다.
  const visible = shouldShow && !needsUpdate && !featurePopupVisible;

  const message = manager?.getMessage() ?? '';
  const link = manager?.getLink() ?? null;

  // '닫기'(세션) — 이번 실행 동안만 숨긴다. 표시 조건이 꺼지며 시트가 내려간다(AN-4).
  const handleDismissForSession = () => {
    manager?.dismissForSession();
  };

  // '하루동안 보지않기' — 24시간 숨긴다(AN-4).
  const handleDismissForDay = () => {
    void manager?.dismissForDay();
  };

  // CTA 이동(AN-3) — 내부 경로는 라우터, http(s)는 외부 브라우저. 그 외 형식은 무시(크래시 금지). 이동 후 세션 닫음.
  const handlePressCta = () => {
    if (!link) {
      return;
    }

    if (link.startsWith('/')) {
      router.push(link as never);
      handleDismissForSession();

      return;
    }

    if (EXTERNAL_LINK_PATTERN.test(link)) {
      void Linking.openURL(link).catch(() => undefined);
      handleDismissForSession();
    }
  };

  return (
    // 막·슬라이드·스와이프 닫기는 공용 프리미티브가 든다(AN-2). 막 탭과 스와이프 모두
    // 가벼운 '닫기'(세션)로 처리한다 — 앱 재실행 시 다시 뜬다(AN-4).
    <LiquidSheetModal
      visible={visible}
      onRequestClose={handleDismissForSession}
      swipeToDismiss
      closeAccessibilityLabel='공지 닫기'
    >
      <LiquidBottomSheet
        contentStyle={[
          styles.sheetContent,
          // 홈 인디케이터 자리를 비운다. 인디케이터가 없는 기기(inset 0)에서도
          // 시트 아래 여백이 사라지지 않게 하한을 둔다.
          { paddingBottom: Math.max(insets.bottom, LiquidLayout.section) },
        ]}
      >
        {/* 그랩 핸들 — 시트를 아래로 스와이프하면 닫힌다(제스처는 프리미티브가 받는다). */}
        <View style={styles.handleZone}>
          <SheetGrabberView />
        </View>

        <ScrollView
          style={styles.messageScroll}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
        >
          <PretendardText weight='medium' style={styles.message}>
            {message}
          </PretendardText>
        </ScrollView>

        {/* 이동(AN-3)은 이 시트의 주 액션이라 잉크 알약이다. link가 없으면 두지 않는다 —
            그때 시트는 읽고 닫는 알림뿐이라 알약이 하나도 없는 것이 맞다. */}
        {link ? (
          <LiquidPillButton
            label='자세히 보기'
            variant='primary'
            block
            onPress={handlePressCta}
            style={styles.cta}
          />
        ) : null}

        {/* 닫기 두 가지(AN-4)는 3차 액션이라 면을 두지 않는다. 채움 알약 두 개를 나란히
            두면 `하루동안 보지않기`가 말줄임되고(고정 높이 + 한 줄), 무엇보다 닫기가
            이동보다 무거워 보인다. */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismissForSession}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='닫기'
          >
            <PretendardText weight='medium' style={styles.buttonText}>
              닫기
            </PretendardText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismissForDay}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='하루동안 보지않기'
          >
            <PretendardText weight='medium' style={styles.buttonText}>
              하루동안 보지않기
            </PretendardText>
          </TouchableOpacity>
        </View>
      </LiquidBottomSheet>
    </LiquidSheetModal>
  );
};

const styles = StyleSheet.create({
  // 시트 위쪽은 그래버가 자기 여백(marginTop 8)을 들고 있어 프리미티브 기본값(28)을 비운다.
  sheetContent: {
    paddingTop: 4,
  },
  // 그랩 핸들 터치 영역 — 스와이프 제스처를 넉넉히 받도록 아래 여백을 둔다.
  handleZone: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  messageScroll: {
    maxHeight: MESSAGE_MAX_HEIGHT,
  },
  messageContent: {
    paddingVertical: 12,
  },
  message: {
    fontSize: LiquidType.body.fontSize,
    // 본문 토큰의 행간(20)은 한 줄 라벨 기준이라, 여러 줄로 흐르는 공지 문장에는 빽빽하다.
    lineHeight: 22,
    color: Liquid.ink,
  },
  cta: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  // 글자 버튼 — 면이 없어도 44pt 터치 타깃은 채운다(HIG).
  closeButton: {
    flex: 1,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    color: Liquid.inkMuted,
  },
});

export default observer(AnnouncementSheetView);
