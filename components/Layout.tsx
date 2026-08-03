import { FC, ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import LogInView from './login/LogInView';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';
import AlertView from './alert/AlertView';
import ToastView from './toast/ToastView';
import { Acg } from '@/constants/DesignTokens';
import AcgScreenBackground from './acg/AcgScreenBackground';

interface Props {
  children: ReactNode;
  /**
   * 콘텐츠 아래에 까는 지면 레이어(ACG 리디자인).
   *
   * **기본값이 공통 지면(`AcgScreenBackground`)이다** — 앱 전 화면이 같은 지면 위에
   * 놓이게 하려고 화면마다 넘기는 대신 여기서 깐다(2026-08-04). 세이프에어리어 여백까지
   * 이어져야 하므로 패딩이 걸리는 컨테이너가 아니라 그 **바깥**에 둔다.
   *
   * 다른 지면을 쓰려면 노드를 넘기고(홈·정보 탭의 지형 이미지), 지면을 아예 원치 않으면
   * `null`을 넘긴다(공유 이미지 내보내기처럼 자체 캔버스를 그리는 화면).
   */
  background?: ReactNode;
  paddingHorizontal?: number;
  // 토스트를 화면 하단에서 띄우는 높이. 하단 CTA가 있는 화면은 낮춰서
  // 토스트가 버튼 위에 떠 겹쳐 보이지 않게 한다(기본 100).
  toastBottom?: number;
  // 세이프에어리어를 적용할 방향. 기본은 전 방향이며, 바텀 시트로 뜨는 화면은
  // 상단에 상태바가 없어 top을 빼야 헤더 위에 빈 여백이 생기지 않는다.
  // iOS edge-to-edge 탭 화면은 'bottom'을 빼 리스트가 탭바 뒤로 흐르게 한다.
  edges?: readonly Edge[] | undefined;
}

const ALL_EDGES = ['top', 'right', 'bottom', 'left'] as const;

const Layout: FC<Props> = ({
  children,
  background = <AcgScreenBackground />,
  paddingHorizontal = 20,
  toastBottom = 100,
  edges = ALL_EDGES,
}) => {
  const insets = useSafeAreaInsets();

  // 네이티브 SafeAreaView 컴포넌트는 최초 마운트 프레임에서 inset을 0으로 보고하는
  // 레이스가 있어(탭 첫 진입 시 스켈레톤이 다이나믹 아일랜드까지 올라감), 루트 프로바이더가
  // 즉시 올바른 값을 주는 useSafeAreaInsets로 지정 방향의 세이프에어리어 패딩을 직접 계산한다.
  const edgeInsets: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[safeAreaStyle, edgeInsets]}>
      {background}
      <View style={[containerStyle, { paddingHorizontal }]}>{children}</View>
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={toastBottom} />
    </View>
  );
};

const safeAreaStyle: ViewStyle = {
  flex: 1,
  // 지면 노드가 덮지만, 그 노드가 뜨기 전 한 프레임과 `background={null}` 화면을 위해
  // 같은 지면색을 깔아 둔다.
  backgroundColor: Acg.bg,
};

const containerStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
  width: '100%',
  position: 'relative',
};

export default observer(Layout);
