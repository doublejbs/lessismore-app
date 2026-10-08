import { FC } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import HomeMountainBandView from '@/components/home/HomeMountainBandView';
import OnboardingTripFooterView from '@/components/onboarding/OnboardingTripFooterView';
import LogInView from '@/components/login/LogInView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import WelcomeValueRowView from './WelcomeValueRowView';
import useWelcomeState from './useWelcomeState';

// 산 띠 높이(상단 세이프에어리어 제외). 글자는 이 띠 아래 흰 지면에서 시작한다(OB-14).
const BAND_HEIGHT = 200;
// 워드마크(logo.png 4096×800) — 높이 24에 맞춘 폭.
const LOGO_HEIGHT = 24;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 4096) / 800);

// 첫 실행 환영 화면(OB-14): 산 띠 → 워드마크 → 제목 → 가치 3행 / 하단 라임 1개 + 둘러보기 + 로그인 링크.
const WelcomeView: FC = () => {
  const l10n = app.getL10n();
  // fullScreenModal 안에서는 네이티브 인셋이 첫 마운트에 0일 수 있어 루트 프로바이더 값을 쓴다(OB-3과 같은 이유).
  const insets = useSafeAreaInsets();
  const { isGuest, handleStart, handleBrowse, handleLogin } =
    useWelcomeState();

  const loginLink = isGuest ? (
    <TouchableOpacity
      style={styles.loginLink}
      onPress={handleLogin}
      activeOpacity={0.7}
      accessibilityRole='link'
      accessibilityLabel={l10n.t('welcome.login')}
    >
      <PretendardText weight='medium' style={styles.loginLinkText}>
        {l10n.t('welcome.login')}
      </PretendardText>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <HomeMountainBandView
          height={BAND_HEIGHT + insets.top}
          bleed={AcgLayout.screenPadding}
        />
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode='contain'
          accessible
          accessibilityRole='image'
          accessibilityLabel={l10n.t('welcome.logoLabel')}
        />
        <PretendardText
          weight='semibold'
          style={styles.title}
          accessibilityRole='header'
        >
          {l10n.t('welcome.title')}
        </PretendardText>
        <View style={styles.values}>
          <WelcomeValueRowView
            icon='scale-outline'
            title={l10n.t('welcome.values.weight.title')}
            subtitle={l10n.t('welcome.values.weight.subtitle')}
          />
          <WelcomeValueRowView
            icon='partly-sunny-outline'
            title={l10n.t('welcome.values.weather.title')}
            subtitle={l10n.t('welcome.values.weather.subtitle')}
          />
          <WelcomeValueRowView
            icon='notifications-outline'
            title={l10n.t('welcome.values.reminder.title')}
            subtitle={l10n.t('welcome.values.reminder.subtitle')}
          />
        </View>
      </ScrollView>
      <OnboardingTripFooterView
        primaryLabel={l10n.t('welcome.start')}
        onPrimary={handleStart}
        secondaryLabel={l10n.t('welcome.browse')}
        onSecondary={() => {
          void handleBrowse();
        }}
        footnote={loginLink}
      />
      {/* fullScreenModal 위에 떠야 해서 화면이 직접 렌더한다(AU-10 — 가이드와 같은 이유). */}
      {isGuest ? (
        <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 24,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    marginTop: 8,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    marginTop: 16,
  },
  values: {
    marginTop: 28,
    gap: 20,
  },
  loginLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLinkText: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default observer(WelcomeView);
