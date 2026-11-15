import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgShadow, AcgType, Radius } from '@/constants/DesignTokens';

interface Props {
  label: string;
}

/**
 * 지도 상단 안내 한 줄 (MAP-2) — 지도 데이터 로드 실패(`map.loadFailed`)·옛 바이너리(`map.unsupportedBinary`).
 * 정보일 뿐 누를 것이 아니라 셰브론도 액션도 없다. 지도 위에 떠 있는 알약이라 흰 면 + 그림자다(지도 위 요소 예외).
 * 위치는 부모가 정한다(상단 오버레이 아래).
 */
const MapNoticeLineView: FC<Props> = ({ label }) => {
  return (
    <View
      style={styles.band}
      accessible
      accessibilityRole='text'
      accessibilityLabel={label}
    >
      <Ionicons name='alert-circle-outline' size={14} color={Acg.ink} />
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
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.card,
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default MapNoticeLineView;
