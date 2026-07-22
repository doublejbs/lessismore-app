import { FC, ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import LogInView from './login/LogInView';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';
import AlertView from './alert/AlertView';
import ToastView from './toast/ToastView';
import { Color } from '@/constants/DesignTokens';

interface Props {
  children: ReactNode;
  paddingHorizontal?: number;
  // 토스트를 화면 하단에서 띄우는 높이. 하단 CTA가 있는 화면은 낮춰서
  // 토스트가 버튼 위에 떠 겹쳐 보이지 않게 한다(기본 100).
  toastBottom?: number;
  // 세이프에어리어를 적용할 방향. 기본은 전 방향이며, 바텀 시트로 뜨는 화면은
  // 상단에 상태바가 없어 top을 빼야 헤더 위에 빈 여백이 생기지 않는다.
  edges?: readonly Edge[];
}

const ALL_EDGES = ['top', 'right', 'bottom', 'left'] as const;

const Layout: FC<Props> = ({
  children,
  paddingHorizontal = 20,
  toastBottom = 100,
  edges = ALL_EDGES,
}) => {
  return (
    <SafeAreaView style={safeAreaStyle} edges={edges}>
      <View style={[containerStyle, { paddingHorizontal }]}>{children}</View>
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={toastBottom} />
    </SafeAreaView>
  );
};

const safeAreaStyle: ViewStyle = {
  flex: 1,
  backgroundColor: Color.background, // 필요에 따라 배경색 조정
};

const containerStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
  width: '100%',
  position: 'relative',
};

export default observer(Layout);
