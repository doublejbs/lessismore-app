import { FC, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Assistant from '@/model/assistant/Assistant';
import AssistantAction from '@/model/assistant/AssistantAction';
import AssistantRole from '@/model/assistant/AssistantRole';
import AssistantUserBubbleView from './AssistantUserBubbleView';
import AssistantReplyView from './AssistantReplyView';
import AssistantStatusLineView from './AssistantStatusLineView';
import AssistantErrorView from './AssistantErrorView';

interface Props {
  assistant: Assistant;
  onApply: (action: AssistantAction) => void;
  onSkip: (action: AssistantAction) => void;
  onRetry: () => void;
  onViewTrip: (bagId: string) => void;
}

// 세로 대화 목록(AS-3) — 아래가 최신. 새 내용이 붙으면 끝으로 스크롤한다.
const AssistantMessageListView: FC<Props> = ({
  assistant,
  onApply,
  onSkip,
  onRetry,
  onViewTrip,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const messages = assistant.getMessages();
  const lastReply = assistant.getLastAssistantMessage();
  const lastReplyId = lastReply?.getId() ?? null;
  const lastReplyText = lastReply?.getText() ?? '';
  const primaryActionId = assistant.getPrimaryActionId();
  const errorKind = assistant.getErrorKind();
  const announcedRef = useRef<string | null>(null);

  // 새 도우미 메시지 도착을 스크린 리더에 알린다(AS-3 접근성).
  useEffect(() => {
    if (!lastReplyId || announcedRef.current === lastReplyId) {
      return;
    }

    announcedRef.current = lastReplyId;

    if (lastReplyText) {
      AccessibilityInfo.announceForAccessibility(lastReplyText);
    }
  }, [lastReplyId, lastReplyText]);

  const handleContentSizeChange = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps='handled'
      keyboardDismissMode='interactive'
      onContentSizeChange={handleContentSizeChange}
    >
      {messages.length === 0 && (
        <View style={styles.greeting}>
          <PretendardText weight='semibold' style={styles.greetingTitle}>
            {app.getL10n().t('assistant.greeting.title')}
          </PretendardText>
          <PretendardText style={styles.greetingBody}>
            {app.getL10n().t('assistant.greeting.body')}
          </PretendardText>
        </View>
      )}
      {messages.map(message =>
        message.getRole() === AssistantRole.User ? (
          <AssistantUserBubbleView key={message.getId()} message={message} />
        ) : (
          <AssistantReplyView
            key={message.getId()}
            message={message}
            primaryActionId={primaryActionId}
            isApplying={assistant.isApplying()}
            isBlocked={action => assistant.isActionBlocked(action)}
            onApply={onApply}
            onSkip={onSkip}
            onViewTrip={onViewTrip}
          />
        )
      )}
      {assistant.isWaiting() && <AssistantStatusLineView />}
      {errorKind && (
        <AssistantErrorView
          errorKind={errorKind}
          canRetry={assistant.canRetry()}
          onRetry={onRetry}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  greeting: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 6,
  },
  greetingTitle: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
  },
  greetingBody: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
});

export default observer(AssistantMessageListView);
