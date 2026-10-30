import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import AssistantAction from '@/model/assistant/AssistantAction';
import AssistantMessage from '@/model/assistant/AssistantMessage';
import AssistantActionCardView from './AssistantActionCardView';

interface Props {
  message: AssistantMessage;
  primaryActionId: string | null;
  isApplying: boolean;
  isBlocked: (action: AssistantAction) => boolean;
  onApply: (action: AssistantAction) => void;
  onSkip: (action: AssistantAction) => void;
  onViewTrip: (bagId: string) => void;
}

// 도우미 말풍선(AS-3) — 면 없이 흰 지면 위 본문(평문·줄바꿈 그대로, 마크다운 없음) + 아래로 적용 카드.
const AssistantReplyView: FC<Props> = ({
  message,
  primaryActionId,
  isApplying,
  isBlocked,
  onApply,
  onSkip,
  onViewTrip,
}) => {
  const text = message.getText();
  const actions = message.getVisibleActions();

  if (!text && actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!!text && (
        <PretendardText style={styles.text} accessibilityRole='text' selectable>
          {text}
        </PretendardText>
      )}
      {actions.map(action => (
        <AssistantActionCardView
          key={action.getId()}
          action={action}
          primary={action.getId() === primaryActionId}
          applyDisabled={isApplying || isBlocked(action)}
          onApply={onApply}
          onSkip={onSkip}
          onViewTrip={onViewTrip}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    gap: 12,
  },
  text: {
    ...AcgType.body,
    color: Acg.ink,
  },
});

export default observer(AssistantReplyView);
