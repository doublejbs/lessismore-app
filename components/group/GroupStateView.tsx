import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';

interface Props {
  title: string;
  actionLabel: string;
  onPress: () => void;
}

/**
 * 그룹 화면의 비정상 상태 한 장 (GRP-6 엣지 케이스).
 * 사라진 그룹 · 참여하지 않은 그룹 · 조회 실패가 같은 문법을 쓴다 — 문구와 액션만 다르다.
 */
const GroupStateView: FC<Props> = ({ title, actionLabel, onPress }) => {
  return (
    <View style={styles.container}>
      <PretendardText weight='semibold' style={styles.title}>
        {title}
      </PretendardText>
      <TouchableOpacity
        style={styles.action}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={actionLabel}
      >
        <PretendardText weight='semibold' style={styles.actionLabel}>
          {actionLabel}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  actionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default GroupStateView;
