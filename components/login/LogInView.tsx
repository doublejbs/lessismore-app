import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidBottomSheet from '@/components/liquid/LiquidBottomSheet';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import app from '@/model/app/App';

interface Props {
  logInAlertManager: LogInAlertManager;
}

// 제공자 로고. 잉크 면 위 Google은 컬러 그대로, 흰 면 위 Apple은 잉크 단색이다(목업 §12).
const PROVIDER_LOGO_SIZE = 20;

/**
 * AU-1 로그인 (Liquid Depth).
 *
 * **가운데 뜨는 모달이 아니라 바텀 시트다**(목업 §12) — 로그인은 화면을 가로막는 경고가
 * 아니라 "여기서 이어 하자"는 제안이고, 엄지가 닿는 아래에서 올라오는 편이 짧다.
 * 라우트가 아니라 전역 모달인 구조는 그대로다(`LogInAlertManager.show()`로 어디서든 호출).
 *
 * 뒤 화면은 지형 0.7 + 베일로 덮는다 — 어디서 눌렀든 로그인은 같은 자리로 읽혀야 한다.
 */
const LogInView: FC<Props> = ({ logInAlertManager }) => {
  const isVisible = logInAlertManager.isVisible();
  /**
   * 진행 표시는 **누른 제공자 버튼에만** 붙인다(AU-1). 나머지 버튼은 재탭만 막으면 되므로
   * `isLoading`으로 비활성한다 — 어느 버튼이 진행 중인지가 표시와 어긋나면 안 된다.
   */
  const loadingProvider = logInAlertManager.getLoadingProvider();
  const isLoading = logInAlertManager.isLoading();
  const [isEmailLoginMode, setIsEmailLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleClickCancel = () => {
    logInAlertManager.hide();
    setIsEmailLoginMode(false);
    setEmail('');
    setPassword('');
  };

  const handleClickConfirm = () => {
    app.getAnalyticsManager()?.logClick('login', { provider: 'google' });
    logInAlertManager.confirm();
  };

  const handleClickEmailLogin = () => {
    setIsEmailLoginMode(true);
  };

  const handleClickBack = () => {
    setIsEmailLoginMode(false);
    setEmail('');
    setPassword('');
  };

  const handleClickLogin = async () => {
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');

      return;
    }

    app.getAnalyticsManager()?.logClick('login', { provider: 'email' });
    await logInAlertManager.loginWithEmail(email, password);
  };

  const handleClickAppleLogin = async () => {
    app.getAnalyticsManager()?.logClick('login', { provider: 'apple' });
    await logInAlertManager.loginWithApple();
  };

  if (!isVisible) {
    return null;
  }

  const renderGoogleLogo = () => (
    <Svg
      width={PROVIDER_LOGO_SIZE}
      height={PROVIDER_LOGO_SIZE}
      viewBox='0 0 24 24'
    >
      <Path
        fill='#4285F4'
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
      />
      <Path
        fill='#34A853'
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      />
      <Path
        fill='#FBBC05'
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
      />
      <Path
        fill='#EA4335'
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      />
    </Svg>
  );

  const renderAppleLogo = () => (
    <Svg
      width={PROVIDER_LOGO_SIZE}
      height={PROVIDER_LOGO_SIZE}
      viewBox='0 0 24 24'
    >
      <Path
        fill={Liquid.ink}
        d='M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z'
      />
    </Svg>
  );

  const renderEmailMode = () => (
    <>
      <PretendardText weight='bold' style={styles.title}>
        이메일로 로그인
      </PretendardText>

      <View style={styles.stack}>
        <TextInput
          style={styles.input}
          placeholder='이메일'
          placeholderTextColor={Liquid.inkMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType='email-address'
          autoCapitalize='none'
          autoComplete='email'
        />
        <TextInput
          style={styles.input}
          placeholder='비밀번호'
          placeholderTextColor={Liquid.inkMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete='password'
        />
        <LiquidPillButton
          label='확인'
          variant='primary'
          block
          onPress={handleClickLogin}
          disabled={isLoading}
          busy={loadingProvider === 'email'}
          leading={
            loadingProvider === 'email' ? (
              <ActivityIndicator color={Liquid.surface} />
            ) : null
          }
        />
        <TouchableOpacity
          style={styles.textButton}
          onPress={handleClickBack}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel='뒤로가기'
        >
          <PretendardText weight='medium' style={styles.textButtonLabel}>
            뒤로가기
          </PretendardText>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderProviderMode = () => (
    <>
      <PretendardText weight='bold' style={styles.title}>
        {'가진 것을 알면\n더 가볍게 떠날 수 있어요'}
      </PretendardText>
      <PretendardText style={styles.subtitle}>
        로그인하고 창고와 배낭을 동기화하세요
      </PretendardText>

      <View style={styles.stack}>
        <LiquidPillButton
          label='Google로 계속하기'
          variant='primary'
          block
          onPress={handleClickConfirm}
          disabled={isLoading}
          busy={loadingProvider === 'google'}
          leading={
            loadingProvider === 'google' ? (
              <ActivityIndicator color={Liquid.surface} />
            ) : (
              renderGoogleLogo()
            )
          }
        />

        {/* AU-1: Apple 로그인은 iOS·웹만 지원한다 — Android에는 버튼 자체를 그리지 않는다. */}
        {Platform.OS !== 'android' ? (
          <LiquidPillButton
            label='Apple로 계속하기'
            variant='secondary'
            block
            onPress={handleClickAppleLogin}
            disabled={isLoading}
            busy={loadingProvider === 'apple'}
            // 흰 면 위 버튼이라 인디케이터도 잉크다 — Google(잉크 면)의 흰 스피너와 갈린다.
            leading={
              loadingProvider === 'apple' ? (
                <ActivityIndicator color={Liquid.ink} />
              ) : (
                renderAppleLogo()
              )
            }
          />
        ) : null}

        <TouchableOpacity
          style={styles.textButton}
          onPress={handleClickEmailLogin}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel='이메일로 로그인'
        >
          <PretendardText weight='medium' style={styles.textButtonLabel}>
            이메일로 로그인
          </PretendardText>
        </TouchableOpacity>
      </View>

      <PretendardText style={styles.legal}>
        {'계속하면 이용약관 및 개인정보 처리방침에\n동의하는 것으로 간주합니다'}
      </PretendardText>
    </>
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      statusBarTranslucent
      onRequestClose={handleClickCancel}
    >
      <View style={styles.root}>
        <LiquidBackdrop screen='login' glowPosition='topLeft' />
        {/* 시트 밖을 눌러 닫는다. 시트에는 닫기 버튼이 없어 이 영역이 유일한 취소 경로다. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClickCancel}
          accessibilityRole='button'
          accessibilityLabel='로그인 창 닫기'
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetHolder}
          pointerEvents='box-none'
        >
          <LiquidBottomSheet
            contentStyle={
              isEmailLoginMode ? styles.emailSheetContent : undefined
            }
          >
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode='contain'
            />
            {isEmailLoginMode ? renderEmailMode() : renderProviderMode()}
          </LiquidBottomSheet>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheetHolder: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  /**
   * 이메일 모드는 입력이 곧 키보드를 부르고, 그러면 시트가 키보드 위에 붙는다 — 홈 인디케이터
   * 자리를 비울 필요가 없어 기본(44)보다 좁게 둔다(닉네임 편집 시트와 같은 판단).
   */
  emailSheetContent: {
    paddingBottom: 28,
  },
  // 워드마크는 5.12:1 비율이라 높이 30에 맞춘 폭을 고정한다(목업 §12: 높이 30).
  logo: {
    width: 154,
    height: 30,
    alignSelf: 'center',
  },
  title: {
    marginTop: 20,
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
  stack: {
    marginTop: 26,
    gap: 10,
  },
  /**
   * 알약 버튼 줄에 섞이는 3차 액션이라 면을 두지 않는다. 높이 48은 목업 값이자
   * 44 터치 타깃을 넘긴다.
   */
  textButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: 14,
    color: Liquid.inkMuted,
  },
  /**
   * `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다(TextInput 예외).
   * 높이·모서리를 아래 버튼과 같은 알약으로 맞춰 입력과 액션이 한 덩어리로 읽힌다.
   */
  input: {
    height: LiquidLayout.pillHeight,
    paddingHorizontal: 20,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    fontFamily: 'Pretendard-Medium',
    fontSize: 15,
    color: Liquid.ink,
  },
  /**
   * 약관 안내. 목업의 `inkSubtle`(11.5px에서 ≈2.2:1)은 AA(4.5:1)에 못 미쳐 한 단계 올렸다 —
   * 동의로 간주된다는 문장이라 읽히지 않으면 안 된다.
   */
  legal: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 18,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
});

export default observer(LogInView);
