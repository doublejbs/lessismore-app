import { FC, ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogInView from './login/LogInView';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';
import AlertView from './alert/AlertView';
import ToastView from './toast/ToastView';

interface Props {
  children: ReactNode;
}

const Layout: FC<Props> = ({ children }) => {
  return (
    <SafeAreaView style={safeAreaStyle}>
      <View style={containerStyle}>{children}</View>
      {app.getLogInAlertManager() && (
        <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      )}
      {app.getAlertManager() && (
        <AlertView alertManager={app.getAlertManager()!} />
      )}
      {app.getToastManager() && (
        <ToastView toastManager={app.getToastManager()!} bottom={100} />
      )}
    </SafeAreaView>
  );
};

const safeAreaStyle: ViewStyle = {
  flex: 1,
  backgroundColor: '#fff', // 필요에 따라 배경색 조정
};

const containerStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
  width: '100%',
  paddingHorizontal: 20,
  position: 'relative',
};

export default observer(Layout);
