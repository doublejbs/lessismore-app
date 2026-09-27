import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
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

// 시트 slide-up/down 이동 거리. 닫힘 상태에서 화면 아래로 이만큼 내려둔다.
const SHEET_OFFSET = 320;

// 주 액션 알약은 앱의 다른 주 액션(GroupJoinView 등)과 같은 48(HIG 44pt 이상).
const PRIMARY_BUTTON_HEIGHT = 48;

// iOS만 Modal이 완전히 내려간 뒤 `onDismiss`를 준다. 그 신호를 기다렸다가 ATT를 띄워야 내려가는 모달과
// 시스템 팝업이 겹치지 않는다. 다른 플랫폼은 시트 전환이 끝나는 때를 완료로 본다(Android는 띄울 일이 없다).
const USES_MODAL_DISMISS_EVENT = Platform.OS === 'ios';

// 닫을 수 없는 시트라 안드로이드 뒤로가기도 무시한다.
const handleRequestClose = () => {};

// AD-3 2: iOS ATT 시스템 팝업 앞에 한 번 띄우는 앱 디자인의 추적 안내 시트.
// 버튼은 중립적인 `계속` 하나다 — 허용을 유도하거나 보상을 걸지 않는다(App Store 5.1.2).
// **닫을 수 없다**(스와이프·바깥 탭·닫기 버튼·뒤로가기 없음) — `계속`이 유일한 출구이고 항상 ATT로
// 이어진다(5.1.1). 시트가 뜨지 못하면(강제 업데이트 게이트·다른 모달) 서비스가 시트 없이 바로 ATT를 묻는다.
// 공지 시트 패턴(RN Modal transparent + 공용 스프링 전환)을 따르고, 전역 1곳(app/_layout.tsx 최상위)에서
// 렌더한다. 웹·Android에서는 뜨지 않는다(서비스가 띄우지 않는다).
const AdTrackingPromptSheetView = () => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SHEET_OFFSET));
  const [mounted, setMounted] = useState(false);

  const adService = app.getAdService();
  const isRequested = adService.isTrackingPromptVisible();
  const needsUpdate = app.getForceUpdateManager()?.getNeedsUpdate() ?? false;
  // 강제 업데이트 게이트(APP-7)가 떠 있으면 띄우지 않는다 — 게이트가 최상위를 유지한다.
  const visible = isRequested && !needsUpdate;

  const handleCloseComplete = useCallback(() => {
    setMounted(false);

    if (!USES_MODAL_DISMISS_EVENT) {
      app.getAdService().completeTrackingPrompt();
    }
  }, []);

  const handleShow = () => {
    adService.markTrackingPromptShown();
  };

  const handleDismiss = () => {
    adService.completeTrackingPrompt();
  };

  const handleContinue = () => {
    adService.acceptTrackingPrompt();
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

  // 게이트에 가려 시트를 띄울 수 없으면 기다리지 않고 시트 없이 ATT로 넘긴다(AD-3 2).
  useEffect(() => {
    if (isRequested && needsUpdate) {
      app.getAdService().skipTrackingPrompt();
    }
  }, [isRequested, needsUpdate]);

  // 호스트가 내려가면 기다리는 요청을 풀어 준다 — 동의 흐름이 멈추지 않게.
  useEffect(() => {
    return () => {
      app.getAdService().skipTrackingPrompt();
    };
  }, []);

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
      onRequestClose={handleRequestClose}
      {...(USES_MODAL_DISMISS_EVENT ? { onDismiss: handleDismiss } : {})}
    >
      {/* 딤 배경은 탭해도 닫히지 않는다 — `계속`이 유일한 출구다. */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
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
          <PretendardText
            weight='semibold'
            style={styles.title}
            accessibilityRole='header'
          >
            {l10n.t('ad.trackingPrompt.title')}
          </PretendardText>

          <PretendardText style={styles.body}>
            {l10n.t('ad.trackingPrompt.body')}
          </PretendardText>

          {/* 화면의 주 액션 — 라임 알약 + 잉크 글자(HM-8). */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            activeOpacity={0.85}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('ad.trackingPrompt.continue')}
          >
            <PretendardText weight='semibold' style={styles.primaryText}>
              {l10n.t('ad.trackingPrompt.continue')}
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
  // 그랩 핸들·닫기 버튼이 없어 제목이 시트 위 여백(섹션 간격)에서 바로 시작한다.
  sheet: {
    backgroundColor: Acg.paper,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.section,
    paddingHorizontal: AcgLayout.screenPadding,
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
});

export default observer(AdTrackingPromptSheetView);
