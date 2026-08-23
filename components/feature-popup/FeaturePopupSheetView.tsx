import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Linking,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import FeaturePopupItemView from '@/components/feature-popup/FeaturePopupItemView';
import { AcgType, Color, Radius, Spacing } from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';

// http(s) 링크 판별 — 이 경우만 외부 브라우저로 연다(FP-3/FP-4).
const EXTERNAL_LINK_PATTERN = /^https?:\/\//i;

const SHEET_OFFSET = 300;

// 신기능 안내 팝업(FP-2). 화면 중앙 카드형 모달.
// AnnouncementSheetView 패턴(RN Modal transparent + Animated fade + useSafeAreaInsets + observer)을 따른다.
// 전역 1곳(app/_layout.tsx 최상위)에서 렌더한다.
const FeaturePopupSheetView = () => {
  const l10n = app.getL10n();
  // 훅은 모두 컴포넌트 최상단에서 무조건 같은 순서로 호출한다(조건부 훅 금지).
  // 매니저 접근·표시 판정 같은 분기는 훅을 전부 부른 뒤로 미룬다.
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Animated 값은 lazy 초기화로 한 번만 만든다(렌더 중 ref.current 접근을 피한다).
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SHEET_OFFSET));
  const [mounted, setMounted] = useState(false);

  const manager = app.getFeaturePopupManager();
  const forceUpdateManager = app.getForceUpdateManager();

  const shouldShow = manager?.shouldShow() ?? false;
  const needsUpdate = forceUpdateManager?.getNeedsUpdate() ?? false;

  // 강제 업데이트 게이트(APP-7)가 떠 있으면 팝업을 띄우지 않는다(FP-6 우선순위).
  const visible = shouldShow && !needsUpdate;

  const title = manager?.getTitle() ?? '';
  const subtitle = manager?.getSubtitle() ?? null;
  const items = manager?.getItems() ?? [];
  const buttonLabel = manager?.getButtonLabel() || l10n.t('common.confirm');
  const buttonLink = manager?.getButtonLink() ?? null;
  const skippable = manager?.isSkippable() ?? true;
  // 강제(차단) 모드(FP-7) — 닫기 경로 전부 차단, 아이템 탭 비활성, 버튼은 이동만.
  const forced = manager?.isForced() ?? false;
  const handleCloseComplete = useCallback(() => {
    setMounted(false);
  }, []);

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

  // 표시 조건에 따라 공용 스프링 slide-in/out과 fade를 재생한다.
  useSheetTransition({
    visible,
    fadeAnim,
    slideAnim,
    slideOffset: SHEET_OFFSET,
    onCloseComplete: handleCloseComplete,
  });

  const shouldRender = mounted || visible;

  // 링크 이동(FP-3/FP-4) — 내부 경로는 라우터, http(s)는 외부 브라우저. 그 외 형식은 무시(크래시 금지).
  const openLink = (link: string) => {
    if (link.startsWith('/')) {
      router.push(link as never);

      return;
    }

    if (EXTERNAL_LINK_PATTERN.test(link)) {
      void Linking.openURL(link).catch(() => undefined);
    }
  };

  // 닫음은 id 영구 닫음으로 처리한다(FP-5). 딤 탭 / 하드웨어 back.
  const handleDismiss = () => {
    // 강제 모드는 하드웨어 back·딤 탭을 무시한다 — 닫기 경로가 전부 없어야 한다(FP-7).
    if (forced) {
      return;
    }

    void manager?.dismiss();
  };

  // 아이템 탭(FP-3) — link가 있으면 이동하고 팝업을 닫는다(id 영구 닫음).
  const handlePressItem = (link: string | null) => {
    // 강제 모드는 아이템 탭 비활성(FP-7). 렌더에서 disabled 처리하지만 이중 안전으로 가드한다.
    if (forced) {
      return;
    }

    if (link) {
      openLink(link);
    }

    void manager?.dismiss();
  };

  // 메인 버튼(FP-4) — buttonLink가 있으면 이동, 없으면 닫기만. 어느 경우든 id 영구 닫음.
  // 강제 모드(FP-7)에서는 이동만 하고 팝업을 유지한다(dismiss 호출 안 함).
  const handlePressButton = () => {
    if (buttonLink) {
      openLink(buttonLink);
    }

    if (forced) {
      return;
    }

    void manager?.dismiss();
  };

  // 건너뛰기(FP-5) — id 영구 닫음.
  const handleSkip = () => {
    void manager?.dismiss();
  };

  return (
    <Modal
      visible={shouldRender}
      transparent={true}
      animationType='none'
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* 딤 배경 탭은 id 영구 닫음으로 처리한다(FP-5).
            강제 모드는 딤 탭으로 닫을 수 없으므로 '닫기' 터쳐블 자체를 두지 않는다(FP-7). */}
        {forced ? (
          <View style={styles.overlayTouchable} />
        ) : (
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={handleDismiss}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('app.featurePopup.close')}
          />
        )}

        <View style={styles.centerArea} pointerEvents='box-none'>
          <Animated.View
            style={[
              styles.cardTouchable,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* 카드 자체 탭은 딤 닫힘으로 전파되지 않게 activeOpacity=1 래퍼로 감싼다. */}
            <TouchableOpacity
              activeOpacity={1}
              style={styles.cardTouchableContent}
            >
              <View
                style={[
                  styles.card,
                  { paddingBottom: Spacing.section + insets.bottom },
                ]}
              >
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cardContent}
              >
                <PretendardText weight='bold' style={styles.title}>
                  {title}
                </PretendardText>

                {subtitle ? (
                  <PretendardText weight='regular' style={styles.subtitle}>
                    {subtitle}
                  </PretendardText>
                ) : null}

                {items.length > 0 ? (
                  <View style={styles.itemGroup}>
                    {items.map((item, index) => (
                      <FeaturePopupItemView
                        key={`${item.title}-${index}`}
                        item={item}
                        onPress={() => handlePressItem(item.link ?? null)}
                        showDivider={index < items.length - 1}
                        // 강제 모드는 아이템 탭 비활성 — 정보 표시만(FP-7).
                        disabled={forced}
                      />
                    ))}
                  </View>
                ) : null}
              </ScrollView>

              {/* 메인 버튼(FP-4) — 필수 채움형 풀폭 버튼.
                  강제 모드에서 buttonLink가 없으면 버튼은 닫기 역할뿐이라 숨긴다(FP-7). */}
              {!forced || buttonLink ? (
                <TouchableOpacity
                  style={styles.mainButton}
                  onPress={handlePressButton}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={buttonLabel}
                >
                  <PretendardText weight='bold' style={styles.mainButtonText}>
                    {buttonLabel}
                  </PretendardText>
                </TouchableOpacity>
              ) : null}

              {/* 건너뛰기(FP-5) — showSkip !== false일 때만 노출. 강제 모드는 showSkip 값과 무관하게 숨긴다(FP-7). */}
              {skippable && !forced ? (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('app.featurePopup.skip')}
                >
                  <PretendardText weight='medium' style={styles.skipText}>
                    {l10n.t('app.featurePopup.skip')}
                  </PretendardText>
                </TouchableOpacity>
              ) : null}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Color.overlay,
  } as ViewStyle,
  // 딤 전체를 덮는 탭 영역 — 카드 뒤에 깔아 배경 탭으로 닫는다.
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  // 카드를 화면 중앙에 배치한다. box-none으로 카드 밖 영역 탭은 딤으로 전달한다.
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
  } as ViewStyle,
  cardTouchable: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  } as ViewStyle,
  cardTouchableContent: {
    width: '100%',
  } as ViewStyle,
  card: {
    // 콘텐츠가 많아도 카드가 cardTouchable maxHeight(85%) 안으로 줄어들도록 shrink 허용.
    flexShrink: 1,
    backgroundColor: Color.background,
    borderRadius: Radius.modal,
    paddingTop: Spacing.section,
    paddingHorizontal: Spacing.section,
  } as ViewStyle,
  // 스크롤 영역만 축소되게 해, 남는 높이가 부족해도 아래 메인 버튼·건너뛰기는 밀리지 않는다.
  scroll: {
    flexShrink: 1,
  } as ViewStyle,
  cardContent: {
    paddingTop: Spacing.item,
  } as ViewStyle,
  title: {
    ...AcgType.screenTitle,
    color: Color.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...AcgType.sectionSubtitle,
    marginTop: Spacing.item,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  // 아이템 그룹 — 아웃라인 컨테이너 안에 행을 담고 행 사이만 구분선을 긋는다(앱 리스트 톤).
  itemGroup: {
    marginTop: Spacing.section,
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Color.background,
  } as ViewStyle,
  // 메인 버튼 — 검은 채움 풀폭. 44pt 이상 터치 타깃.
  mainButton: {
    marginTop: Spacing.section,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Color.chipActiveBg,
  } as ViewStyle,
  mainButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
  // 건너뛰기 — 하단 텍스트 버튼. 44pt 이상 터치 타깃.
  skipButton: {
    marginTop: Spacing.item,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  skipText: {
    ...AcgType.control,
    color: Color.textTertiary,
  },
});

export default observer(FeaturePopupSheetView);
