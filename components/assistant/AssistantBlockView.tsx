import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AssistantBlockState from '@/model/assistant/AssistantBlockState';

interface Props {
  blockState: AssistantBlockState;
  onNewChat: () => void;
}

const MESSAGE_KEYS: Record<AssistantBlockState, string> = {
  [AssistantBlockState.None]: '',
  [AssistantBlockState.Offline]: 'assistant.block.offline',
  [AssistantBlockState.Limit]: 'assistant.block.limit',
  [AssistantBlockState.TurnLimit]: 'assistant.block.turnLimit',
  [AssistantBlockState.ProviderChanged]: 'assistant.block.providerChanged',
};

const BUTTON_HEIGHT = 44;

/**
 * 입력 바 자리를 대신하는 안내(AS-7·AS-9·§6) — 오프라인·한도 카드·발화 30회·공급자 변경.
 * 이어 갈 수 없는 대화(30회·공급자 변경)에만 `새 대화`를 둔다.
 */
const AssistantBlockView: FC<Props> = ({ blockState, onNewChat }) => {
  const l10n = app.getL10n();
  const needsNewChat =
    blockState === AssistantBlockState.TurnLimit ||
    blockState === AssistantBlockState.ProviderChanged;

  return (
    <View style={styles.container}>
      <View style={styles.card} accessibilityRole='summary'>
        <PretendardText weight='medium' style={styles.message}>
          {l10n.t(MESSAGE_KEYS[blockState])}
        </PretendardText>
        {needsNewChat && (
          <TouchableOpacity
            style={styles.button}
            onPress={onNewChat}
            accessibilityRole='button'
          >
            <PretendardText weight='semibold' style={styles.buttonLabel}>
              {l10n.t('assistant.newChat')}
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
  },
  card: {
    padding: 16,
    gap: 12,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  message: {
    ...AcgType.body,
    color: Acg.ink,
  },
  button: {
    alignSelf: 'flex-start',
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

export default observer(AssistantBlockView);
