import { useState } from 'react';
import { LayoutChangeEvent, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import Assistant from '@/model/assistant/Assistant';
import AssistantAction from '@/model/assistant/AssistantAction';
import AssistantSendKind from '@/model/assistant/AssistantSendKind';

/**
 * 도우미 화면의 내비게이션·확인 알럿·키보드 보정 상태(AS-3).
 *
 * 키보드 회피 보정: `presentation: 'modal'`(iOS pageSheet)은 화면 위쪽이 내려와 있어서
 * KeyboardAvoidingView가 자기 프레임(부모 기준)과 키보드 좌표(화면 기준)를 그대로 비교하면
 * 시트가 내려온 만큼 덜 올라간다. 시트 높이와 창 높이의 차이를 `keyboardVerticalOffset`으로 준다.
 */
const useAssistantScreenState = (assistant: Assistant) => {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const [rootHeight, setRootHeight] = useState(windowHeight);
  const keyboardOffset =
    Platform.OS === 'ios' ? Math.max(windowHeight - rootHeight, 0) : 0;

  const handleRootLayout = (event: LayoutChangeEvent) => {
    setRootHeight(event.nativeEvent.layout.height);
  };

  const handleClose = () => {
    router.back();
  };

  const handleNewChat = () => {
    const l10n = app.getL10n();

    app.getAlertManager()?.show({
      message: l10n.t('assistant.newChatConfirm'),
      confirmText: l10n.t('assistant.newChatConfirmButton'),
      cancelText: l10n.t('common.cancel'),
      onConfirm: async () => {
        assistant.reset();
      },
    });
  };

  // 기록이 길어졌거나 공급자가 바뀌어 막힌 경우의 `새 대화`는 확인 없이 바로 비운다 — 이어 갈 수 없는 대화다.
  const handleForceNewChat = () => {
    assistant.reset();
  };

  const handleSend = () => {
    void assistant.send(AssistantSendKind.Text);
  };

  const handleSuggestion = (text: string) => {
    void assistant.send(AssistantSendKind.Suggestion, text);
  };

  const handleRetry = () => {
    void assistant.retry();
  };

  const handleApply = (action: AssistantAction) => {
    void assistant.apply(action);
  };

  const handleSkip = (action: AssistantAction) => {
    void assistant.skip(action);
  };

  // `여행 보기` — 도우미를 닫고 상세로(AS-3).
  const handleViewTrip = (bagId: string) => {
    app.getAnalyticsManager()?.logClick('assistant_view_trip');
    router.replace(`/bag/${bagId}`);
  };

  return {
    keyboardOffset,
    handleRootLayout,
    handleClose,
    handleNewChat,
    handleForceNewChat,
    handleSend,
    handleSuggestion,
    handleRetry,
    handleApply,
    handleSkip,
    handleViewTrip,
  };
};

export default useAssistantScreenState;
