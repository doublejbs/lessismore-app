import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  message: string;
  onRetry: () => void;
}

/**
 * 상세 화면 구간의 조회 실패 한 줄 (GRP-8 · GRP-9).
 *
 * **"없는 것"과 "못 읽은 것"을 구분한다** — 네트워크 실패에 빈 상태 문구를 보이면 사용자는
 * 일행이 아직 아무것도 올리지 않았다고 읽고 재시도할 방법도 없다. 그룹 목록의 실패 상태와
 * 같은 문법(문구 + `다시 시도`)을 구간 크기로 줄인 것이다.
 */
const GroupSectionErrorView: FC<Props> = ({ message, onRetry }) => {
  const retryLabel = app.getL10n().t('common.retry');

  return (
    <View style={styles.container}>
      <PretendardText style={styles.message}>{message}</PretendardText>
      <TouchableOpacity
        style={styles.retry}
        onPress={onRetry}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={retryLabel}
      >
        <PretendardText weight='semibold' style={styles.retryLabel}>
          {retryLabel}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  message: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  retry: {
    minHeight: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  retryLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default GroupSectionErrorView;
