import { FC, ReactNode } from 'react';
import { SafeAreaView, View, ViewStyle } from 'react-native';
import LogInView from './login/LogInView';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';

interface Props {
  children: ReactNode;
}

const Layout: FC<Props> = ({ children }) => {
  return (
    <SafeAreaView style={safeAreaStyle}>
      <View style={containerStyle}>
        {children}
      </View>
      {app.getLogInAlertManager() && <LogInView logInAlertManager={app.getLogInAlertManager()!} />}
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
    paddingBottom: 20,
    position: 'relative',
  };

export default observer(Layout);
