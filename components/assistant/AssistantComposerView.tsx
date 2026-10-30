import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Assistant, { ASSISTANT_TEXT_MAX_LENGTH } from '@/model/assistant/Assistant';

interface Props {
  assistant: Assistant;
  onSend: () => void;
}

const SEND_SIZE = 44;
const INPUT_MAX_HEIGHT = 120;

/**
 * 입력 바(AS-3) — 여러 줄 입력 + 보내기 아이콘 버튼, 위에 `오늘 {n}회 남음`.
 * 빈 입력·응답 대기·미결 카드 중엔 보내기를 막는다. 미결 카드가 있으면 이유를 한 줄로 알린다(AS-5).
 */
const AssistantComposerView: FC<Props> = ({ assistant, onSend }) => {
  const l10n = app.getL10n();
  const remaining = assistant.getRemaining();
  const canSend = assistant.canSendDraft();
  const hasPendingActions = assistant.hasUnresolvedActions();

  return (
    <View style={styles.container}>
      {(hasPendingActions || remaining !== null) && (
        <View style={styles.metaRow}>
          {hasPendingActions ? (
            <PretendardText style={styles.notice}>
              {l10n.t('assistant.composer.pendingNotice')}
            </PretendardText>
          ) : (
            <PretendardText style={styles.remaining}>
              {l10n.t('assistant.composer.remaining', { count: remaining ?? 0 })}
            </PretendardText>
          )}
        </View>
      )}
      <View style={styles.row}>
        <TextInput
          value={assistant.getDraft()}
          onChangeText={value => assistant.setDraft(value)}
          multiline
          maxLength={ASSISTANT_TEXT_MAX_LENGTH}
          placeholder={l10n.t('assistant.composer.placeholder')}
          placeholderTextColor={Acg.textMuted}
          // 대기·미결 카드 중에도 편집은 막지 않는다 — editable을 끄면 iOS 키보드가 내려간다. 보내기만 막는다.
          style={styles.input}
          accessibilityLabel={l10n.t('assistant.composer.placeholder')}
        />
        <TouchableOpacity
          style={[styles.send, !canSend && styles.sendDisabled]}
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('assistant.composer.send')}
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons
            name='arrow-up'
            size={20}
            color={canSend ? Acg.paper : Acg.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
  },
  remaining: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  notice: {
    ...AcgType.meta,
    color: Acg.warnText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: SEND_SIZE,
    maxHeight: INPUT_MAX_HEIGHT,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
    ...AcgType.control,
    // TextInput은 PretendardText를 거치지 않으므로 폰트를 직접 지정한다(BD-6과 같은 이유).
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
  },
  send: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.ink,
  },
  sendDisabled: {
    backgroundColor: Acg.controlFill,
  },
});

export default observer(AssistantComposerView);
