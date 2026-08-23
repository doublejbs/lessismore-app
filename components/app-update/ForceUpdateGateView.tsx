import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  BackHandler,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Spacing } from '@/constants/DesignTokens';

// 스토어 이동 URL (APP-7). Android는 마켓 스킴 우선, 실패 시 웹으로 폴백.
const IOS_STORE_URL = 'https://apps.apple.com/app/id6751174681';
const ANDROID_STORE_URL = 'market://details?id=com.doublejbs.useless';
const ANDROID_STORE_FALLBACK_URL =
  'https://play.google.com/store/apps/details?id=com.doublejbs.useless';

const ForceUpdateGateView = () => {
  const l10n = app.getL10n();
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
          {l10n.t('app.update.title')}
        </PretendardText>
        <PretendardText weight='regular' style={styles.description}>
          {l10n.t('app.update.description')}
        </PretendardText>
        <TouchableOpacity
          style={styles.button}
          onPress={handlePressUpdate}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('app.update.action')}
        >
          <PretendardText weight='semibold' style={styles.buttonText}>
            {l10n.t('app.update.action')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 전체 화면 검은 배경 오버레이. 토큰에 검은 표면색이 없어 textPrimary(#000000)를 배경으로 쓴다.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Color.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenH,
    zIndex: 1000,
    elevation: 1000,
  } as ViewStyle,
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  title: {
    ...AcgType.screenTitle,
    color: Color.background,
    textAlign: 'center',
  },
  description: {
    ...AcgType.sectionSubtitle,
    marginTop: Spacing.item,
    // 검은 배경 위 보조 문구 — iconMuted(#B0B8C1)가 흰 배경 보조색보다 대비가 잘 나온다.
    color: Color.iconMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.section,
    minHeight: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.section,
    borderRadius: 26,
    backgroundColor: Color.background,
  },
  buttonText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
});

export default observer(ForceUpdateGateView);
