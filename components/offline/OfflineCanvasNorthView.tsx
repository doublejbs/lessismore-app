import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgShadow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  // 캔버스가 돌아간 각도(도, 시계 방향). 화살표가 그만큼 돌아 진북을 가리킨다.
  rotation: number;
}

const SIZE = 44;

/**
 * 우상단 북쪽 표시 (OF-6). 캔버스는 방향 모드에서 돌아간다 — 지금 어디가 북쪽인지 늘 보이게 둔다.
 * 지도 위에 떠 있는 요소라 흰 원 + 그림자다(HM-8 "그림자는 지도 위 요소에만").
 */
const OfflineCanvasNorthView: FC<Props> = ({ rotation }) => {
  return (
    <View
      style={styles.north}
      accessible
      accessibilityRole='image'
      accessibilityLabel={app.getL10n().t('offline.canvas.northLabel')}
    >
      <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
        <Ionicons name='caret-up' size={14} color={Acg.ink} />
      </View>
      <PretendardText style={styles.label} weight='semibold'>
        {app.getL10n().t('offline.canvas.north')}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  north: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.chip,
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
  },
});

export default OfflineCanvasNorthView;
