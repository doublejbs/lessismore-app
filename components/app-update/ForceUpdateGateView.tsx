import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { View, StyleSheet, Linking, Platform, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';

// 스토어 이동 URL (APP-7). Android는 마켓 스킴 우선, 실패 시 웹으로 폴백.
const IOS_STORE_URL = 'https://apps.apple.com/app/id6751174681';
const ANDROID_STORE_URL = 'market://details?id=com.doublejbs.useless';
const ANDROID_STORE_FALLBACK_URL =
  'https://play.google.com/store/apps/details?id=com.doublejbs.useless';

/**
 * 강제 업데이트 게이트 (Liquid Depth, APP-7).
 *
 * **화면 전체가 잉크 면이다** — 흰 카드로 띄우면 닫을 수 있는 알럿처럼 보이는데 이 화면은
 * 닫히지 않는다(뒤로가기도 막는다). 면을 뒤집어 "여기서 멈춘다"를 형태로 말한다.
 * 순검정이 아니라 `Liquid.ink`인 이유는 팔레트에 검정이 없어서다.
 *
 * 그 위 주 액션은 **라임 알약**이다 — 이 화면의 유일한 면이자 유일한 액션이라 액센트를
 * 다툴 상대가 없다. 잉크 알약(`primary`)은 지면에 묻히고, 흰 알약은 토스트의 알림 문법이라
 * 액션으로 읽히지 않는다.
 */
const ForceUpdateGateView = () => {
  const insets = useSafeAreaInsets();
  const manager = app.getForceUpdateManager();
  const needsUpdate = manager?.getNeedsUpdate() ?? false;

  useEffect(() => {
    if (!needsUpdate) {
      return;
    }

    // Android 하드웨어 뒤로가기를 무효화해 게이트를 우회하지 못하게 한다(APP-7 — 닫기 없음).
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );

    return () => {
      subscription.remove();
    };
  }, [needsUpdate]);

  const handlePressUpdate = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL(ANDROID_STORE_URL);
      } catch {
        // Play 스토어 앱이 없거나 마켓 스킴을 못 열면 웹 URL로 폴백한다.
        await Linking.openURL(ANDROID_STORE_FALLBACK_URL).catch(
          () => undefined
        );
      }

      return;
    }

    await Linking.openURL(IOS_STORE_URL).catch(() => undefined);
  };

  // 게이트가 필요 없으면 아무것도 렌더하지 않는다.
  if (!needsUpdate) {
    return null;
  }

  return (
    <View
      style={[
        styles.overlay,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        <PretendardText weight='bold' style={styles.title}>
          업데이트가 필요해요
        </PretendardText>
        <PretendardText style={styles.description}>
          최신 버전에서 새 기능을 사용할 수 있어요.
        </PretendardText>
        <LiquidPillButton
          label='스토어에서 업데이트'
          variant='accent'
          block
          onPress={handlePressUpdate}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Liquid.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LiquidLayout.screenH,
    zIndex: 1000,
    elevation: 1000,
  },
  /**
   * 폭은 상한만 둔다. `alignSelf: 'stretch'`가 아니라 `width: '100%'`인 이유는 알럿 카드와
   * 같다 — stretch는 상한에 걸리는 순간 정렬이 `flex-start`로 떨어져 넓은 화면에서 좌측에
   * 붙는다.
   */
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.surface,
    textAlign: 'center',
  },
  // 잉크 면 위 보조 글자 — 흰 제목보다 한 단계 낮다(잉크 위 6.8:1).
  description: {
    marginTop: 8,
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkOnQuiet,
    textAlign: 'center',
  },
  // 알약이 문장 폭을 꽉 채운다 — 프리미티브의 `block`은 `alignSelf: 'stretch'`라
  // 가운데 정렬 컨테이너 안에서도 폭을 다 먹는다.
  button: {
    marginTop: LiquidLayout.section,
  },
});

export default observer(ForceUpdateGateView);
