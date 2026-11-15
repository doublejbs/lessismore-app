import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';

interface Props {
  label: string;
}

/**
 * 오프라인 상태 한 줄 띠 (OF-5 `오프라인 · 10.09 저장본` · OF-6 오프라인 지도 상단 줄). 연회색 면 위 메타 글자 —
 * 정보일 뿐 누를 것이 아니라 셰브론도 액션도 없다. 닫기 없음(연결되면 사라진다).
 */
const OfflineSnapshotBandView: FC<Props> = ({ label }) => {
  return (
    <View
      style={styles.band}
      accessible
      accessibilityRole='text'
      accessibilityLabel={label}
    >
      <Ionicons name='cloud-offline-outline' size={14} color={Acg.ink} />
      <PretendardText style={styles.label} numberOfLines={2}>
        {label}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default OfflineSnapshotBandView;
