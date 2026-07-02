import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import LoadingView from '@/components/ui/LoadingView';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import app from '@/model/app/App';

interface Props {
  logInAlertManager: LogInAlertManager;
}

const LogInView: FC<Props> = ({ logInAlertManager }) => {
  const isVisible = logInAlertManager.isVisible();
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

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      onRequestClose={handleClickCancel}
    >
      <Pressable style={styles.overlay} onPress={handleClickCancel}>
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode='contain'
          />
          {!isEmailLoginMode && (
            <Text style={styles.subtitle}>{'로그인 후 이용 가능합니다'}</Text>
          )}
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
                  <Text style={styles.loginButtonText}>확인</Text>
                </TouchableOpacity>
                <View style={styles.linkContainer}>
                  <TouchableOpacity onPress={handleClickBack}>
                    <Text style={styles.linkText}>뒤로가기</Text>
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
                  <Text style={styles.loginButtonText}>Google로 로그인</Text>
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
                    <Text style={styles.loginButtonText}>Apple로 로그인</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.emailLoginButton}
                  onPress={handleClickEmailLogin}
                >
                  <Text style={styles.emailLoginButtonText}>
                    이메일로 로그인
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 350,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    paddingBottom: 20,
    gap: 24,
  },
  logo: {
    width: '100%',
    height: 32,
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 48,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -4.5,
    color: '#000000',
  },
  subtitle: {
    fontFamily: 'Pretendard-Bold',
    textAlign: 'center',
    fontSize: 16,
    color: '#000000',
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
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
  },
  googleIcon: {
    marginRight: 10,
  },
  appleLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
  },
  appleIcon: {
    marginRight: 10,
  },
  loginButtonText: {
    fontFamily: 'Pretendard-Bold',
    color: 'white',
    fontSize: 16,
  },
  emailLoginButton: {
    paddingVertical: 8,
  },
  emailLoginButtonText: {
    fontFamily: 'Pretendard-Medium',
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    color: '#000000',
  },
  linkContainer: {
    width: '100%',
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: 'Pretendard-Medium',
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default observer(LogInView);
