import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgType,
  Color,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';
import app from '@/model/app/App';

// 시트 slide-up/down 이동 거리. 닫힘 상태에서 화면 아래로 이만큼 내려둔다(추적 안내 시트와 같은 값).
const SHEET_OFFSET = 320;

// 스와이프로 닫는 판정 임계값 — 아래로 이만큼 끌거나(px) 아래 방향 속도가 빠르면 닫는다(공지 시트와 같은 값).
const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.5;

// 주 액션 알약은 추적 안내 시트와 같은 48(HIG 44pt 이상).
const PRIMARY_BUTTON_HEIGHT = 48;

// 보조 글자 버튼의 HIG 44pt 터치 타깃.
const SECONDARY_BUTTON_MIN_HEIGHT = 44;

// 그랩 핸들 치수(공지 시트와 같은 값).
const GRABBER_WIDTH = 40;
const GRABBER_HEIGHT = 4;

// iOS만 Modal이 완전히 내려간 뒤 `onDismiss`를 준다. 그 신호를 기다렸다가 구독 시트(formSheet)를 열어야
// 내려가는 Modal과 겹치지 않는다. 다른 플랫폼은 시트 전환이 끝나는 때를 완료로 본다.
const USES_MODAL_DISMISS_EVENT = Platform.OS === 'ios';

// SUB-9: 광고 누적 노출 뒤 한 번 뜨는 구독 안내 시트. 추적 안내 시트(`AdTrackingPromptSheetView`)와 같은
// 모양이지만 **닫을 수 있다**(스와이프·바깥 탭·`괜찮아요`·안드로이드 뒤로가기). 주 액션 `구독 알아보기`는
// 이 시트의 유일한 라임이다(HM-8). 전역 1곳(app/_layout.tsx 최상위)에서 렌더한다.
// 강제 업데이트 게이트·공지·신기능 팝업·로그인·알럿·추적 안내 시트·동의 흐름이 떠 있으면 띄우지 않고 요청을 거둔다 —
// 다음 광고 때 다시 본다.
const SubscriptionNudgeSheetView = () => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SHEET_OFFSET));
  const [mounted, setMounted] = useState(false);

  // 그랩 영역을 아래로 스와이프하면 닫는다. 임계값 미만이면 원위치로 스프링백한다.
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
          app.getSubscriptionNudge()?.dismissSheet();

          return;
        }

        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  );

  const nudge = app.getSubscriptionNudge();
  const adService = app.getAdService();
  const isRequested = nudge?.isSheetRequested() ?? false;
  const isBlocked =
    (app.getForceUpdateManager()?.getNeedsUpdate() ?? false) ||
    (app.getAnnouncementManager()?.shouldShow() ?? false) ||
    (app.getFeaturePopupManager()?.shouldShow() ?? false) ||
    (app.getLogInAlertManager()?.isVisible() ?? false) ||
    (app.getAlertManager()?.isVisible() ?? false) ||
    adService.isConsentFlowActive();
  const visible = isRequested && !isBlocked;
  const priceString = nudge?.getPriceString() ?? null;
  const body = priceString
    ? l10n.t('subscription.nudgeBody', { price: priceString })
    : l10n.t('subscription.nudgeBodyNoPrice');

  const handleCloseComplete = useCallback(() => {
    setMounted(false);

    if (!USES_MODAL_DISMISS_EVENT) {
      app.getSubscriptionNudge()?.completeSheet();
    }
  }, []);

  const handleShow = () => {
    nudge?.markSheetShown();
  };

  const handleModalDismiss = () => {
    nudge?.completeSheet();
  };

  const handleDismiss = () => {
    nudge?.dismissSheet();
  };

  const handleExplore = () => {
    nudge?.acceptSheet();
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [visible]);

  // 다른 시트·게이트에 가려 띄울 수 없으면 기다리지 않고 요청을 거둔다(기록하지 않는다).
  useEffect(() => {
    if (isRequested && isBlocked) {
      app.getSubscriptionNudge()?.skipSheet();
    }
  }, [isRequested, isBlocked]);

  useSheetTransition({
    visible,
    fadeAnim,
    slideAnim,
    slideOffset: SHEET_OFFSET,
    onCloseComplete: handleCloseComplete,
  });

  const shouldRender = mounted || visible;

  return (
    <Modal
      visible={shouldRender}
      transparent={true}
      animationType='none'
      onShow={handleShow}
      onRequestClose={handleDismiss}
      {...(USES_MODAL_DISMISS_EVENT ? { onDismiss: handleModalDismiss } : {})}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* 딤 배경을 탭하면 닫는다. */}
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleDismiss}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('common.close')}
        />

        <Animated.View
          accessibilityViewIsModal={true}
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, Spacing.section),
            },
          ]}
        >
          {/* 그랩 핸들 — 아래로 스와이프하면 닫힌다. */}
          <View style={styles.grabberZone} {...panResponder.panHandlers}>
            <View style={styles.grabber} />
          </View>

          <PretendardText
            weight='semibold'
            style={styles.title}
            accessibilityRole='header'
          >
            {l10n.t('subscription.title')}
          </PretendardText>

          <PretendardText style={styles.body}>{body}</PretendardText>

          {/* 이 시트의 주 액션 — 라임 알약 + 잉크 글자(HM-8). */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleExplore}
            activeOpacity={0.85}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('subscription.nudgeExplore')}
          >
            <PretendardText weight='semibold' style={styles.primaryText}>
              {l10n.t('subscription.nudgeExplore')}
            </PretendardText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDismiss}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('subscription.nudgeNotNow')}
          >
            <PretendardText weight='medium' style={styles.secondaryText}>
              {l10n.t('subscription.nudgeNotNow')}
            </PretendardText>
          </TouchableOpacity>
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
  },
  overlayTouchable: {
    flex: 1,
  },
  // 그랩 영역이 위 여백을 맡는다(추적 안내 시트는 핸들이 없어 섹션 간격을 둔다).
  sheet: {
    backgroundColor: Acg.paper,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  grabberZone: {
    alignItems: 'center',
    paddingVertical: Spacing.item,
  },
  grabber: {
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: Radius.listThumb,
    backgroundColor: Color.chipInactiveBg,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  body: {
    ...AcgType.body,
    color: Acg.ink,
    marginTop: Spacing.item,
  },
  primaryButton: {
    marginTop: Spacing.section,
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
    paddingVertical: (PRIMARY_BUTTON_HEIGHT - AcgType.control.lineHeight) / 2,
  },
  primaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  // 보조 글자 버튼 — 면 없이 글자만(주 액션과 형태로 갈린다).
  secondaryButton: {
    marginTop: Spacing.item,
    minHeight: SECONDARY_BUTTON_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(SubscriptionNudgeSheetView);
