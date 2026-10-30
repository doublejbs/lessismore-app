import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AssistantMessage from '@/model/assistant/AssistantMessage';
import AssistantSendState from '@/model/assistant/AssistantSendState';

interface Props {
  message: AssistantMessage;
}

// 사용자 말풍선(AS-3) — 우측 잉크 채움 + 흰 글자. 기록에 남지 못한 발화는 아래에 `보내지 못함`(AS-7).
const AssistantUserBubbleView: FC<Props> = ({ message }) => {
  const failed = message.getSendState() === AssistantSendState.Failed;

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, failed && styles.bubbleFailed]}>
        <PretendardText style={styles.text} accessibilityRole='text' selectable>
          {message.getText()}
        </PretendardText>
      </View>
      {failed && (
        <PretendardText weight='medium' style={styles.failed}>
          {app.getL10n().t('assistant.message.notSent')}
        </PretendardText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.ink,
  },
  bubbleFailed: {
    opacity: 0.6,
  },
  text: {
    ...AcgType.body,
    color: Acg.paper,
  },
  failed: {
    ...AcgType.meta,
    color: Acg.error,
  },
});

export default observer(AssistantUserBubbleView);
