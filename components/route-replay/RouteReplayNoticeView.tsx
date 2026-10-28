import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';

interface Props {
  message: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

/** 리플레이 빈 상태·실패 상태(RR-3) — 문장 하나 + 선택적 보조 버튼(코스 화면 상태 뷰와 같은 모양). */
const RouteReplayNoticeView: FC<Props> = ({
  message,
  actionLabel,
  onPressAction,
}) => {
  return (
    <View style={styles.root}>
      <PretendardText style={styles.message}>{message}</PretendardText>
      {actionLabel && onPressAction ? (
        <TouchableOpacity
          style={styles.action}
          onPress={onPressAction}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={actionLabel}
        >
          <PretendardText weight='semibold' style={styles.actionLabel}>
            {actionLabel}
          </PretendardText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: Acg.paper,
  },
  message: {
    ...AcgType.body,
    color: Acg.textSecondary,
    textAlign: 'center',
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  actionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default RouteReplayNoticeView;
