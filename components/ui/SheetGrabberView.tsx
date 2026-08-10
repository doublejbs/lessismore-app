import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Liquid } from '@/constants/DesignTokens';

/**
 * 시트 상단 핸들바(그래버) — 드래그로 닫을 수 있다는 어포던스.
 *
 * **네이티브 `formSheet` 라우트에는 쓰지 않는다.** 거기서는 `sheetGrabberVisible: true`로
 * OS가 그린다. 이 컴포넌트는 OS 그래버가 없는 곳 — `presentation: 'modal'`(pageSheet) 라우트와
 * RN `Modal` 기반 시트 — 에서만 쓴다.
 *
 * 예전에는 시트마다 따로 그려서 치수·색이 네 갈래로 갈렸다(40×4 iconMuted / 40×4 chipInactiveBg /
 * 36×4 하드코딩 #D1D1D6 / 36×4 borderLight). 그중 borderLight(#F0F0F0)는 흰 배경에서 거의
 * 안 보여 어포던스 구실을 못 했다. 40×4 하나로 통일하고, 색은 잉크 스케일의 옅은 값
 * (`inkSubtle` — 빈 체크 원·쉐브론과 같은 자리)을 쓴다. 이 그래버를 쓰는 시트 대부분이
 * Liquid Depth로 이식돼, 따뜻한 회색(`Color.iconMuted`)만 남으면 한 시트 안에서 세대가 갈린다.
 */
const SheetGrabberView: FC = () => {
  return <View style={styles.grabber} />;
};

const styles = StyleSheet.create({
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Liquid.inkSubtle,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});

export default SheetGrabberView;
