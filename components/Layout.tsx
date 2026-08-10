import { FC, ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import LogInView from './login/LogInView';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';
import AlertView from './alert/AlertView';
import ToastView from './toast/ToastView';
import { Liquid } from '@/constants/DesignTokens';

interface Props {
  children: ReactNode;
  /**
   * 콘텐츠 아래에 까는 지면 레이어(Liquid Depth).
   *
   * **기본은 평평한 지면 하나뿐이다**(아래 `safeAreaStyle`의 `Liquid.canvas`) — 지형·베일·
   * 글로우가 필요한 화면은 `<LiquidBackdrop screen=… />`을 직접 넘긴다(홈·정보·배낭 상세·
   * 패킹 등 대부분이 그렇게 한다). 옛 ACG 지면(그레인 + 와이어프레임 측량 마크)을 기본값으로
   * 깔던 자리인데, Liquid Depth의 지면은 단색 캔버스라 기본값에서 걷어냈다(2026-08-11).
   *
   * 노드를 넘길 때는 세이프에어리어 여백까지 이어져야 하므로, 패딩이 걸리는 컨테이너가 아니라
   * 그 **바깥**에 둔다.
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
  background = null,
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
      {/**
       * 전역 오버레이 3종(로그인 시트·알럿·토스트)을 **화면마다** 깐다(APP-6).
       *
       * 루트(`app/_layout.tsx`)에 한 번만 두는 편이 깔끔해 보이지만 RN에서는 동작하지 않는다:
       * ① `Modal`(로그인·알럿)은 자기 위치에서 가장 가까운 뷰 컨트롤러에서 present되므로,
       *    루트에 두면 라우트 모달(`presentation: 'modal'`·`formSheet`) 위에서 present가
       *    거부돼(이미 다른 화면을 present 중) 알럿이 아예 뜨지 않는다 — 알럿을 띄우는 자리
       *    상당수가 그 모달 라우트 안이다(장비 직접 입력·장비 편집·검색 모달·박지 상세 시트).
       * ② `ToastView`는 Modal이 아니라 절대 배치 뷰라, 루트에 두면 라우트 모달 **아래**에
       *    깔려 보이지 않는다.
       * 그래서 라우트 스택 밖에 자체 오버레이를 두는 화면(`app/search`·장비 편집·직접 입력·
       *    배낭 상세·패킹)은 지금도 자기 자리에 따로 마운트한다.
       */}
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={toastBottom} />
    </View>
  );
};

const safeAreaStyle: ViewStyle = {
  flex: 1,
  // 지면 노드를 넘긴 화면에서는 그 노드가 덮지만, 노드가 뜨기 전 한 프레임과 노드를 넘기지
  // 않은 화면(기본값)을 위해 같은 지면색을 깔아 둔다.
  backgroundColor: Liquid.canvas,
};

const containerStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
  width: '100%',
  position: 'relative',
};

export default observer(Layout);
