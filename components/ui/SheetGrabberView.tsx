import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Color } from '@/constants/DesignTokens';

/**
 * 시트 상단 핸들바(그래버) — 드래그로 닫을 수 있다는 어포던스.
 *
 * **네이티브 `formSheet` 라우트에는 쓰지 않는다.** 거기서는 `sheetGrabberVisible: true`로
 * OS가 그린다. 이 컴포넌트는 OS 그래버가 없는 곳 — `presentation: 'modal'`(pageSheet) 라우트와
 * RN `Modal` 기반 시트 — 에서만 쓴다.
 *
 * 예전에는 시트마다 따로 그려서 치수·색이 네 갈래로 갈렸다(40×4 iconMuted / 40×4 chipInactiveBg /
 * 36×4 하드코딩 #D1D1D6 / 36×4 borderLight). 그중 borderLight(#F0F0F0)는 흰 배경에서 거의
 * 안 보여 어포던스 구실을 못 했다. 가장 최근 값(40×4 `iconMuted`)으로 통일한다.
 */
const SheetGrabberView: FC = () => {
  return <View style={styles.grabber} />;
};

const styles = StyleSheet.create({
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Color.iconMuted,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});

export default SheetGrabberView;
