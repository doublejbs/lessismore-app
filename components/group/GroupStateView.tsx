import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import FloatingPillButton from '@/components/FloatingPillButton';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import GroupStateActionVariant from './GroupStateActionVariant';

interface Props {
  title: string;
  actionLabel: string;
  onPress: () => void;
  variant?: GroupStateActionVariant;
  // 플로팅 알약 자리만큼 위로 올릴지. 탭 안 세그먼트처럼 알약이 떠 있는 화면에서만 참이다.
  raised?: boolean;
}

// 플로팅 알약 자리. 이만큼 올려야 상태 한 장이 화면 가운데로 읽힌다.
const RAISED_BOTTOM_PADDING = 80;

/**
 * 그룹 화면의 비정상 상태 한 장 (GRP-1 · GRP-6 엣지 케이스).
 * 사라진 그룹 · 참여하지 않은 그룹 · 조회 실패 · 빈 목록 · 로그인 유도가 같은 문법을 쓴다 —
 * 문구와 액션의 무게만 다르다.
 */
const GroupStateView: FC<Props> = ({
  title,
  actionLabel,
  onPress,
  variant = GroupStateActionVariant.Neutral,
  raised = false,
}) => {
  return (
    <View style={[styles.container, raised && styles.raised]}>
      <PretendardText weight='semibold' style={styles.title}>
        {title}
      </PretendardText>
      {variant === GroupStateActionVariant.Primary ? (
        <FloatingPillButton
          label={actionLabel}
          onPress={onPress}
          variant='primary'
        />
      ) : (
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
      )}
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
  raised: {
    paddingBottom: RAISED_BOTTOM_PADDING,
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
