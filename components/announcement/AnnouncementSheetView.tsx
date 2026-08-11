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
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

// http(s) 링크 판별 — 이 경우만 외부 브라우저로 연다(AN-3).
const EXTERNAL_LINK_PATTERN = /^https?:\/\//i;

// 시트 slide-up/down 이동 거리. 닫힘 상태에서 화면 아래로 이만큼 내려둔다.
const SHEET_OFFSET = 320;

// 스와이프로 닫는 판정 임계값 — 아래로 이만큼 끌거나(px) 아래 방향 속도가 빠르면 닫는다.
const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.5;

// 인앱 공지 바텀 시트(AN-2/AN-3/AN-4).
// BottomMenuModalView 패턴(RN Modal transparent + Animated fade/slide-up + useSafeAreaInsets)을 따른다.
// 전역 1곳(app/_layout.tsx 최상위)에서 렌더한다.
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

        Animated.spring(slideAnim, {
          toValue: 0,
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
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, Spacing.section),
            },
          ]}
        >
          {/* 그랩 핸들 — 아래로 스와이프하면 닫힌다. */}
          <View style={styles.handleZone} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            style={styles.messageScroll}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
          >
            <PretendardText weight='medium' style={styles.message}>
              {message}
            </PretendardText>

            {/* 자세히 보기(AN-3)는 본문 안에 링크로 둔다. link가 없으면 표시하지 않는다. */}
            {link ? (
              <TouchableOpacity
                style={styles.detailLink}
                onPress={handlePressCta}
                accessibilityRole='button'
                accessibilityLabel='자세히 보기'
              >
                <PretendardText weight='semibold' style={styles.detailLinkText}>
                  자세히 보기
                </PretendardText>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          {/* 하단은 두 가지 닫기 옵션을 가로로 둔다(AN-4). */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismissForSession}
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
              accessibilityRole='button'
              accessibilityLabel='하루동안 보지않기'
            >
              <PretendardText weight='medium' style={styles.buttonText}>
                하루동안 보지않기
              </PretendardText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  } as ViewStyle,
  overlayTouchable: {
    flex: 1,
  } as ViewStyle,
  sheet: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.item,
    paddingHorizontal: Spacing.screenH,
  } as ViewStyle,
  // 그랩 핸들 터치 영역 — 스와이프 제스처를 넉넉히 받도록 상하 여백을 둔다.
  handleZone: {
    alignItems: 'center',
    paddingVertical: Spacing.item,
  } as ViewStyle,
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.listThumb,
    backgroundColor: Color.chipInactiveBg,
  } as ViewStyle,
  // 메시지가 길면 시트 안에서 스크롤된다(AN-2 — 레이아웃이 깨지지 않게).
  messageScroll: {
    maxHeight: 320,
  } as ViewStyle,
  messageContent: {
    paddingVertical: Spacing.item,
  } as ViewStyle,
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: Color.textPrimary,
  },
  // 본문 안 '자세히 보기' 링크(AN-3). 메시지 아래에 밑줄 텍스트로 둔다.
  detailLink: {
    marginTop: Spacing.item,
    minHeight: 44,
    justifyContent: 'center',
  } as ViewStyle,
  detailLinkText: {
    fontSize: 15,
    color: Color.textPrimary,
    textDecorationLine: 'underline',
  },
  // 하단 두 닫기 옵션을 가로로 나란히 배치한다. 각 버튼이 폭을 반씩 차지한다.
  buttonRow: {
    flexDirection: 'row',
    marginTop: Spacing.item,
    gap: Spacing.item,
  } as ViewStyle,
  // 닫기 / 하루동안 보지않기 — 회색 채움 버튼. 44pt 이상 터치 타깃.
  closeButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: Color.chipInactiveBg,
  } as ViewStyle,
  buttonText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
});

export default observer(AnnouncementSheetView);
