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
  Linking,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import FeaturePopupItemView from '@/components/feature-popup/FeaturePopupItemView';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

// http(s) 링크 판별 — 이 경우만 외부 브라우저로 연다(FP-3/FP-4).
const EXTERNAL_LINK_PATTERN = /^https?:\/\//i;

// 신기능 안내 팝업(FP-2). 화면 중앙 카드형 모달.
// AnnouncementSheetView 패턴(RN Modal transparent + Animated fade + useSafeAreaInsets + observer)을 따른다.
// 전역 1곳(app/_layout.tsx 최상위)에서 렌더한다.
const FeaturePopupSheetView = () => {
  // 훅은 모두 컴포넌트 최상단에서 무조건 같은 순서로 호출한다(조건부 훅 금지).
  // 매니저 접근·표시 판정 같은 분기는 훅을 전부 부른 뒤로 미룬다.
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Animated 값은 lazy 초기화로 한 번만 만든다(렌더 중 ref.current 접근을 피한다).
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const manager = app.getFeaturePopupManager();
  const forceUpdateManager = app.getForceUpdateManager();

  const shouldShow = manager?.shouldShow() ?? false;
  const needsUpdate = forceUpdateManager?.getNeedsUpdate() ?? false;

  // 강제 업데이트 게이트(APP-7)가 떠 있으면 팝업을 띄우지 않는다(FP-6 우선순위).
  const visible = shouldShow && !needsUpdate;

  const title = manager?.getTitle() ?? '';
  const subtitle = manager?.getSubtitle() ?? null;
  const items = manager?.getItems() ?? [];
  const buttonLabel = manager?.getButtonLabel() ?? '확인';
  const skippable = manager?.isSkippable() ?? true;

  // 표시 조건에 따라 fade-in / fade-out을 재생한다.
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

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
    void manager?.dismiss();
  };

  // 아이템 탭(FP-3) — link가 있으면 이동하고 팝업을 닫는다(id 영구 닫음).
  const handlePressItem = (link: string | null) => {
    if (link) {
      openLink(link);
    }

    void manager?.dismiss();
  };

  // 메인 버튼(FP-4) — buttonLink가 있으면 이동, 없으면 닫기만. 어느 경우든 id 영구 닫음.
  const handlePressButton = () => {
    const buttonLink = manager?.getButtonLink() ?? null;

    if (buttonLink) {
      openLink(buttonLink);
    }

    void manager?.dismiss();
  };

  // 건너뛰기(FP-5) — id 영구 닫음.
  const handleSkip = () => {
    void manager?.dismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType='none'
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* 딤 배경 탭은 id 영구 닫음으로 처리한다(FP-5). */}
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleDismiss}
          accessibilityRole='button'
          accessibilityLabel='신기능 안내 닫기'
        />

        <View style={styles.centerArea} pointerEvents='box-none'>
          {/* 카드 자체 탭은 딤 닫힘으로 전파되지 않게 activeOpacity=1 래퍼로 감싼다. */}
          <TouchableOpacity activeOpacity={1} style={styles.cardTouchable}>
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
                      />
                    ))}
                  </View>
                ) : null}
              </ScrollView>

              {/* 메인 버튼(FP-4) — 필수 채움형 풀폭 버튼. */}
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

              {/* 건너뛰기(FP-5) — showSkip !== false일 때만 노출. */}
              {skippable ? (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  accessibilityRole='button'
                  accessibilityLabel='건너뛰기'
                >
                  <PretendardText weight='medium' style={styles.skipText}>
                    건너뛰기
                  </PretendardText>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
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
    fontSize: 22,
    lineHeight: 30,
    color: Color.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.item,
    fontSize: 15,
    lineHeight: 22,
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
    fontSize: 16,
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
    fontSize: 15,
    color: Color.textTertiary,
  },
});

export default observer(FeaturePopupSheetView);
