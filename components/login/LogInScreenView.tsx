import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import LoadingView from '@/components/ui/LoadingView';
import LogInAlertManager from '@/model/login/LogInAlertManager';

interface Props {
  logInAlertManager: LogInAlertManager;
  onDimPress?: () => void;
}

const LogInScreenView: FC<Props> = ({ logInAlertManager, onDimPress }) => {
  const isLoading = logInAlertManager.isLoading();

  const handleClickConfirm = () => {
    logInAlertManager.confirm();
  };

  const handleModalPress = (event: any) => {
    // 모달 내부 클릭 시 이벤트 전파를 막아서 딤드 클릭 이벤트가 발생하지 않도록 함
    event.stopPropagation();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.modal} onPress={handleModalPress}>
        <Text style={styles.title}>useless</Text>
        <Text style={styles.subtitle}>로그인 후 이용 가능합니다</Text>
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <LoadingView />
          ) : (
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
          )}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  title: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 48,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -4.5,
  },
  subtitle: {
    fontFamily: 'Pretendard-Bold',
    textAlign: 'center',
    fontSize: 16,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 51,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  googleIcon: {
    marginRight: 10,
  },
  loginButtonText: {
    fontFamily: 'Pretendard-Bold',
    color: 'white',
    fontSize: 16,
  },
});

export default observer(LogInScreenView);
