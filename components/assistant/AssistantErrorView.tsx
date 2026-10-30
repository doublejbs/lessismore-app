import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AssistantErrorKind from '@/model/assistant/AssistantErrorKind';

interface Props {
  errorKind: AssistantErrorKind;
  canRetry: boolean;
  onRetry: () => void;
}

const BUTTON_HEIGHT = 44;

// 호출 실패 안내(AS-8) — 네트워크면 `연결이 불안정해요…`, 그 외 `문제가 생겼어요…` + `다시 보내기`. 이전 기록은 그대로다.
const AssistantErrorView: FC<Props> = ({ errorKind, canRetry, onRetry }) => {
  const l10n = app.getL10n();
  const message =
    errorKind === AssistantErrorKind.Network
      ? l10n.t('assistant.error.network')
      : l10n.t('assistant.error.generic');

  return (
    <View style={styles.container} accessibilityLiveRegion='polite'>
      <PretendardText style={styles.message}>{message}</PretendardText>
      {canRetry && (
        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          accessibilityRole='button'
        >
          <PretendardText weight='semibold' style={styles.buttonLabel}>
            {l10n.t('assistant.error.resend')}
          </PretendardText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 8,
  },
  message: {
    ...AcgType.body,
    color: Acg.error,
  },
  button: {
    minHeight: BUTTON_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: BUTTON_HEIGHT / 2,
    borderWidth: 1,
    borderColor: Acg.ink,
    backgroundColor: Acg.paper,
  },
  buttonLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default AssistantErrorView;
