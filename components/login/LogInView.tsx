import { observer } from 'mobx-react-lite';
import { FC, useEffect, useState } from 'react';
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
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import LoadingView from '@/components/ui/LoadingView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Color, Radius } from '@/constants/DesignTokens';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import app from '@/model/app/App';

interface Props {
  logInAlertManager: LogInAlertManager;
}

/** 시트가 올라오는 거리. 실제 시트 높이보다 넉넉히 잡아 어떤 내용 높이에서도 화면 밖에서 시작한다. */
const SHEET_TRAVEL = 420;

const SHEET_DURATION = 260;

const LogInView: FC<Props> = ({ logInAlertManager }) => {
  const isVisible = logInAlertManager.isVisible();
  const isLoading = logInAlertManager.isLoading();
  const [isEmailLoginMode, setIsEmailLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const insets = useSafeAreaInsets();

  /**
   * 닫히는 애니메이션이 끝난 뒤에 언마운트하기 위한 로컬 상태.
   *
   * `Modal visible`을 곧바로 false로 내리면 슬라이드-아웃이 그려질 프레임이 없어 시트가
   * 순간 사라진다 — 다른 시트(공지·하단 메뉴)도 같은 이유로 이 구조를 쓴다.
   */
  const [mounted, setMounted] = useState(isVisible);
  // `useRef(...).current`를 렌더 중 읽으면 react-hooks 규칙에 걸린다 — 초기화 함수로 1회만 만든다.
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SHEET_TRAVEL));

  /**
   * 열릴 때 마운트하고, 닫힐 때는 애니메이션이 끝난 뒤 언마운트한다.
   *
   * 여기 `setMounted(true)`는 lint(`set-state-in-effect`)가 경고하는 형태다. 마운트 토글은
   * 애니메이션의 전제라 effect 밖으로 뺄 수 없고(가시성은 매니저가 외부에서 바꾼다),
   * 이 저장소의 다른 시트들도 같은 구조를 쓴다 — 규칙이 걱정하는 연쇄 렌더는 열림/닫힘
   * 각 1회뿐이다.
   */
  useEffect(() => {
    if (isVisible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: SHEET_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: SHEET_DURATION,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: SHEET_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SHEET_TRAVEL,
        duration: SHEET_DURATION,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [isVisible, fadeAnim, slideAnim]);

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

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible={mounted}
      transparent={true}
      animationType='none'
      onRequestClose={handleClickCancel}
    >
      {/* 딤은 시트와 함께 페이드한다 — 딤만 즉시 사라지면 시트가 허공에서 내려가 보인다. */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable
          style={styles.overlayTouchable}
          onPress={handleClickCancel}
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents='box-none'
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 20) + 8,
            },
          ]}
        >
          {/* 그래버 — 이 시트는 라우트가 아니라 Modal이라 시스템이 그려주지 않는다. */}
          <View style={styles.grabber} />

          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode='contain'
          />
          {/* 안내 문구를 두지 않는다(2026-08-05 사용자 결정) — 이 시트에서 할 일은
              로그인 하나뿐이라 설명이 없어도 통하고, 문구가 있으면 그게 시트의 앵커가 된다. */}
          <View style={styles.buttonContainer}>
            {isLoading ? (
              <LoadingView />
            ) : isEmailLoginMode ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder='이메일'
                  value={email}
                  onChangeText={setEmail}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoComplete='email'
                />
                <TextInput
                  style={styles.input}
                  placeholder='비밀번호'
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete='password'
                />
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleClickLogin}
                >
                  <PretendardText weight='bold' style={styles.loginButtonText}>
                    확인
                  </PretendardText>
                </TouchableOpacity>
                <View style={styles.linkContainer}>
                  <TouchableOpacity onPress={handleClickBack}>
                    <PretendardText weight='medium' style={styles.linkText}>
                      뒤로가기
                    </PretendardText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleClickConfirm}
                >
                  <Svg
                    width={24}
                    height={24}
                    viewBox='0 0 24 24'
                    style={styles.googleIcon}
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
                  <PretendardText weight='bold' style={styles.loginButtonText}>
                    Google로 로그인
                  </PretendardText>
                </TouchableOpacity>

                {Platform.OS !== 'android' && (
                  <TouchableOpacity
                    style={styles.appleLoginButton}
                    onPress={handleClickAppleLogin}
                  >
                    <Svg
                      width={24}
                      height={24}
                      viewBox='0 0 24 24'
                      style={styles.appleIcon}
                    >
                      <Path
                        fill='white'
                        d='M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z'
                      />
                    </Svg>
                    <PretendardText
                      weight='bold'
                      style={styles.loginButtonText}
                    >
                      Apple로 로그인
                    </PretendardText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.emailLoginButton}
                  onPress={handleClickEmailLogin}
                >
                  <PretendardText
                    weight='medium'
                    style={styles.emailLoginButtonText}
                  >
                    이메일로 로그인
                  </PretendardText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // 딤은 화면 전체를 덮고, 시트는 그 위에 따로 얹는다 — 한 계층에 두면 딤 탭이 시트까지 먹는다.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Color.overlay,
  },
  overlayTouchable: {
    flex: 1,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  /**
   * 하단 시트(2026-08-12). 가운데 뜨는 350pt 모달이었는데, 로그인은 **화면을 가로막는 알림이
   * 아니라 다음 걸음**이라 앱의 다른 시트(공지·하단 메뉴·정렬)와 같은 자리에서 올라와야 한다.
   * 상단 모서리만 둥글다(`Radius.sheet`).
   */
  sheet: {
    backgroundColor: Acg.paper,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: 10,
    paddingHorizontal: 24,
    gap: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Acg.hairline,
  },
  logo: {
    width: '100%',
    height: 32,
    alignSelf: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Color.textPrimary,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    width: '100%',
  },
  googleIcon: {
    marginRight: 10,
  },
  appleLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Color.textPrimary,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    width: '100%',
  },
  appleIcon: {
    marginRight: 10,
  },
  loginButtonText: {
    color: Color.background,
    ...AcgType.control,
  },
  emailLoginButton: {
    paddingVertical: 8,
  },
  emailLoginButtonText: {
    color: Color.textTertiary,
    ...AcgType.control,
    textDecorationLine: 'underline',
  },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    // 단일행 입력이라 lineHeight를 얹지 않는다(안드로이드에서 커서 높이가 어긋난다).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
  },
  linkContainer: {
    width: '100%',
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: Color.textTertiary,
    ...AcgType.control,
    textDecorationLine: 'underline',
  },
});

export default observer(LogInView);
