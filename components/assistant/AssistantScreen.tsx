import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertView from '@/components/alert/AlertView';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Assistant from '@/model/assistant/Assistant';
import AssistantBlockState from '@/model/assistant/AssistantBlockState';
import useKeyboard from '@/hooks/useKeyboard';
import AssistantHeaderView from './AssistantHeaderView';
import AssistantMessageListView from './AssistantMessageListView';
import AssistantSuggestionChipsView from './AssistantSuggestionChipsView';
import AssistantComposerView from './AssistantComposerView';
import AssistantBlockView from './AssistantBlockView';
import useAssistantScreenState from './useAssistantScreenState';

interface Props {
  assistant: Assistant;
}

const BOTTOM_GAP = 8;

// AS-3 대화 화면 — 헤더(대상 줄) / 말풍선·카드 목록 / 제안 칩 / 입력 바(또는 막힘 안내).
const AssistantScreen: FC<Props> = ({ assistant }) => {
  const insets = useSafeAreaInsets();
  const { isKeyboardVisible } = useKeyboard();
  const state = useAssistantScreenState(assistant);
  const blockState = assistant.getBlockState();
  const bottomPadding = isKeyboardVisible
    ? BOTTOM_GAP
    : Math.max(insets.bottom, BOTTOM_GAP);
  const showSuggestions =
    assistant.isEmpty() && blockState === AssistantBlockState.None;

  return (
    // 위쪽은 네이티브 SafeAreaView로 실제 겹침만 비운다 — iOS pageSheet에서는 0, 전체 화면으로 뜨는 경우
    // (Android `modal`·딥링크 콜드 스타트)에는 상태 표시줄 높이가 된다.
    <SafeAreaView
      edges={['top']}
      style={styles.root}
      onLayout={state.handleRootLayout}
    >
      <AssistantHeaderView
        assistant={assistant}
        onNewChat={state.handleNewChat}
        onClose={state.handleClose}
      />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={state.keyboardOffset}
      >
        <AssistantMessageListView
          assistant={assistant}
          onApply={state.handleApply}
          onSkip={state.handleSkip}
          onRetry={state.handleRetry}
          onViewTrip={state.handleViewTrip}
        />
        <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
          {showSuggestions && (
            <AssistantSuggestionChipsView
              disabled={!assistant.canCompose()}
              onSelect={state.handleSuggestion}
            />
          )}
          {blockState === AssistantBlockState.None ? (
            <AssistantComposerView
              assistant={assistant}
              onSend={state.handleSend}
            />
          ) : (
            <AssistantBlockView
              blockState={blockState}
              onNewChat={state.handleForceNewChat}
            />
          )}
        </View>
      </KeyboardAvoidingView>
      <AlertView alertManager={app.getAlertManager()!} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  body: {
    flex: 1,
  },
  footer: {
    backgroundColor: Acg.paper,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
});

export default observer(AssistantScreen);
