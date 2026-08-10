import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import LiquidBottomSheet from '@/components/liquid/LiquidBottomSheet';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidType,
} from '@/constants/DesignTokens';

// http(s) 링크 판별 — 이 경우만 외부 브라우저로 연다(AN-3).
const EXTERNAL_LINK_PATTERN = /^https?:\/\//i;

// 시트 slide-up/down 이동 거리. 닫힘 상태에서 화면 아래로 이만큼 내려둔다.
const SHEET_OFFSET = 320;

// 스와이프로 닫는 판정 임계값 — 아래로 이만큼 끌거나(px) 아래 방향 속도가 빠르면 닫는다.
const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.5;

// 메시지가 길면 시트 안에서 스크롤된다(AN-2 — 레이아웃이 깨지지 않게).
const MESSAGE_MAX_HEIGHT = 320;

/**
 * 인앱 공지 바텀 시트 (Liquid Depth, AN-2/AN-3/AN-4).
 *
 * 잉크 막(`Liquid.scrim`) 위로 유리 시트(`LiquidBottomSheet`)가 올라온다 — 로그인·닉네임
 * 편집 시트와 같은 면이라 RN `Modal` 기반 시트가 앱 안에서 한 가지 형태로 읽힌다.
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

  // Animated 값은 lazy 초기화로 한 번만 만든다(렌더 중 ref.current 접근을 피한다).
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SHEET_OFFSET));

  // 그랩 핸들을 아래로 스와이프하면 닫는다(AN-2). 임계값 미만이면 원위치로 스프링백한다.
  // 매니저는 캡처하지 않고 제스처 시점에 싱글톤에서 가져온다(훅 이전 렌더 값에 의존하지 않게).
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 5 && gesture.dy > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy > 0) {
          slideAnim.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        if (
          gesture.dy > SWIPE_CLOSE_DISTANCE ||
          gesture.vy > SWIPE_CLOSE_VELOCITY
        ) {
          // 스와이프 닫기는 가벼운 '닫기'(세션)로 처리한다 — 앱 재실행 시 다시 뜬다(AN-4).
          app.getAnnouncementManager()?.dismissForSession();

          return;
        }

        // 되돌아오는 스프링에도 `overshootClamping`을 건다 — 시트가 제자리를 지나쳤다
        // 돌아오면 손을 뗀 위치가 잘못 읽힌 것처럼 보인다(공용 모션 토큰).
        Animated.spring(slideAnim, {
          toValue: 0,
          ...LiquidMotion.spring,
          useNativeDriver: true,
        }).start();
      },
    })
  );

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

  // 표시 조건에 따라 slide-up(진입) / slide-down(정리)을 재생한다.
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SHEET_OFFSET,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

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
    <Modal
      visible={visible}
      transparent={true}
      // 안드로이드는 이 값이 없으면 딤이 상태바 아래에서 끊겨 지면이 비친다(로그인 시트 선례).
      statusBarTranslucent
      animationType='none'
      onRequestClose={handleDismissForSession}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* 딤 배경 탭은 가벼운 '닫기'(세션)로 처리한다(AN-2/AN-4). */}
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleDismissForSession}
          accessibilityRole='button'
          accessibilityLabel='공지 닫기'
        />

        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
          }}
        >
          <LiquidBottomSheet
            contentStyle={[
              styles.sheetContent,
              // 홈 인디케이터 자리를 비운다. 인디케이터가 없는 기기(inset 0)에서도
              // 시트 아래 여백이 사라지지 않게 하한을 둔다.
              { paddingBottom: Math.max(insets.bottom, LiquidLayout.section) },
            ]}
          >
            {/* 그랩 핸들 — 아래로 스와이프하면 닫힌다. */}
            <View style={styles.handleZone} {...panResponder.panHandlers}>
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Liquid.scrim,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
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
