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
} from 'react-native';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import FeaturePopupItemView from '@/components/feature-popup/FeaturePopupItemView';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

// http(s) 링크 판별 — 이 경우만 외부 브라우저로 연다(FP-3/FP-4).
const EXTERNAL_LINK_PATTERN = /^https?:\/\//i;

/**
 * 신기능 안내 팝업 (Liquid Depth, FP-2). 화면 중앙 카드형 모달.
 *
 * 잉크 막(`Liquid.scrim`) 위에 흰 카드 하나 — 전역 알럿(APP-3)과 같은 문법이라 두 중앙
 * 오버레이가 한 가족으로 읽힌다. 다른 점은 카드 안에 목록과 주 액션이 들어 있다는 것뿐이다.
 *
 * 아이템 그룹은 면을 더 얹지 않고 **조용한 아웃라인**으로만 갈린다(브랜드 링크 카드와 같은
 * 0.5px 헤어라인) — 흰 카드 위에 회색 면을 또 깔면 카드 안에 카드가 생긴다.
 *
 * 전역 1곳(app/_layout.tsx 최상위)에서 렌더한다.
 */
const FeaturePopupSheetView = () => {
  // 훅은 모두 컴포넌트 최상단에서 무조건 같은 순서로 호출한다(조건부 훅 금지).
  // 매니저 접근·표시 판정 같은 분기는 훅을 전부 부른 뒤로 미룬다.
  const router = useRouter();

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
  const buttonLink = manager?.getButtonLink() ?? null;
  const skippable = manager?.isSkippable() ?? true;
  // 강제(차단) 모드(FP-7) — 닫기 경로 전부 차단, 아이템 탭 비활성, 버튼은 이동만.
  const forced = manager?.isForced() ?? false;

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
      visible={visible}
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
            accessibilityLabel='신기능 안내 닫기'
          />
        )}

        <View style={styles.centerArea} pointerEvents='box-none'>
          {/* 카드 자체 탭은 딤 닫힘으로 전파되지 않게 activeOpacity=1 래퍼로 감싼다. */}
          <TouchableOpacity activeOpacity={1} style={styles.cardTouchable}>
            <LiquidCard
              tone='paper'
              radius='card'
              padding={LiquidLayout.cardPadLg}
              style={styles.card}
            >
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
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

              {/* 메인 버튼(FP-4) — 이 카드의 주 액션이라 잉크 알약 하나다.
                  강제 모드에서 buttonLink가 없으면 버튼은 닫기 역할뿐이라 숨긴다(FP-7). */}
              {!forced || buttonLink ? (
                <LiquidPillButton
                  label={buttonLabel}
                  variant='primary'
                  block
                  onPress={handlePressButton}
                  style={styles.mainButton}
                />
              ) : null}

              {/* 건너뛰기(FP-5) — showSkip !== false일 때만 노출. 강제 모드는 showSkip 값과 무관하게 숨긴다(FP-7). */}
              {skippable && !forced ? (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                  activeOpacity={LiquidMotion.pressOpacity}
                  accessibilityRole='button'
                  accessibilityLabel='건너뛰기'
                >
                  <PretendardText weight='medium' style={styles.skipText}>
                    건너뛰기
                  </PretendardText>
                </TouchableOpacity>
              ) : null}
            </LiquidCard>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Liquid.scrim,
  },
  // 딤 전체를 덮는 탭 영역 — 카드 뒤에 깔아 배경 탭으로 닫는다.
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // 카드를 화면 중앙에 배치한다. box-none으로 카드 밖 영역 탭은 딤으로 전달한다.
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LiquidLayout.screenH,
  },
  /**
   * 카드는 화면 높이의 85%까지만 자란다 — 중앙 정렬이라 위아래로 7.5%가 남고, 그 여백이
   * 홈 인디케이터(34)보다 넉넉해 세이프에어리어를 따로 비울 필요가 없다(이식 전에는 카드
   * 안쪽에 `insets.bottom`을 더해 중앙 카드가 아래로 치우쳐 보였다).
   */
  cardTouchable: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  // 콘텐츠가 많아도 카드가 cardTouchable maxHeight(85%) 안으로 줄어들도록 shrink 허용.
  card: {
    flexShrink: 1,
  },
  // 스크롤 영역만 축소되게 해, 남는 높이가 부족해도 아래 메인 버튼·건너뛰기는 밀리지 않는다.
  scroll: {
    flexShrink: 1,
  },
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    textAlign: 'center',
  },
  // 제목 아래 한 단계 낮은 줄 — 로그인 시트의 제목·부제 짝과 같은 값이다.
  subtitle: {
    marginTop: 8,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
  /**
   * 아이템 그룹 — 조용한 아웃라인 컨테이너 안에 행을 담고 행 사이만 구분선을 긋는다.
   * 모서리는 부모 카드(22)보다 낮아야 안쪽 면이 카드 모서리를 밀어내지 않는다.
   */
  itemGroup: {
    marginTop: LiquidLayout.section,
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
    borderRadius: LiquidRadius.tileSm,
    overflow: 'hidden',
  },
  mainButton: {
    marginTop: LiquidLayout.section,
  },
  // 건너뛰기 — 3차 액션이라 면을 두지 않는다. 44pt 터치 타깃은 채운다(HIG).
  skipButton: {
    marginTop: 4,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    color: Liquid.inkMuted,
  },
});

export default observer(FeaturePopupSheetView);
