import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AssistantAction from '@/model/assistant/AssistantAction';
import AssistantActionStatus from '@/model/assistant/AssistantActionStatus';
import {
  getAssistantActionLines,
  getAssistantActionTitle,
} from '@/model/assistant/AssistantActionPresentation';

interface Props {
  action: AssistantAction;
  primary: boolean;
  // 처리할 수 없는 상태(다른 카드 적용 중·같은 턴의 `여행 만들기` 미처리)면 두 버튼을 막는다.
  applyDisabled: boolean;
  onApply: (action: AssistantAction) => void;
  onSkip: (action: AssistantAction) => void;
  onViewTrip: (bagId: string) => void;
}

const BUTTON_HEIGHT = 44;

// 처리된 카드의 상태 줄(AS-3) — `적용됨` / `적용됨 — {사유}` / `건너뜀` / `실패 — {사유}`.
const getStatusText = (action: AssistantAction): string => {
  const l10n = app.getL10n();
  const note = action.getNote();

  switch (action.getStatus()) {
    case AssistantActionStatus.Applied: {
      return note
        ? l10n.t('assistant.action.status.appliedWithNote', { note })
        : l10n.t('assistant.action.status.applied');
    }
    case AssistantActionStatus.Skipped: {
      return l10n.t('assistant.action.status.skipped');
    }
    case AssistantActionStatus.Failed: {
      return l10n.t('assistant.action.status.failed', { reason: note });
    }
    default: {
      return l10n.t('assistant.action.status.applying');
    }
  }
};

/**
 * 적용 카드(AS-3·AS-5) — 제목(도구별 고정) + 모델의 한 줄 요약 + 항목 줄 + `적용`/`건너뛰기`.
 * `적용`은 그 턴의 미결 카드 중 위쪽(`create_trip` 우선)만 라임, 앞 카드가 처리되기 전의 뒤 카드는 비활성이다.
 * 처리되면 버튼 자리가 상태 줄로 바뀌고, `여행 만들기`는 적용 뒤 `여행 보기`를 붙인다.
 */
const AssistantActionCardView: FC<Props> = ({
  action,
  primary,
  applyDisabled,
  onApply,
  onSkip,
  onViewTrip,
}) => {
  const l10n = app.getL10n();
  const title = getAssistantActionTitle(action);
  const summary = action.getSummary();
  const lines = getAssistantActionLines(action);
  const status = action.getStatus();
  const createdBagId = action.getCreatedBagId();
  const isPending = status === AssistantActionStatus.Pending;
  const isApplying = status === AssistantActionStatus.Applying;
  const isFailed = status === AssistantActionStatus.Failed;

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={summary ? `${title}. ${summary}` : title}
        style={styles.heading}
      >
        <PretendardText weight='semibold' style={styles.title}>
          {title}
        </PretendardText>
        {!!summary && (
          <PretendardText style={styles.summary}>{summary}</PretendardText>
        )}
      </View>
      {lines.length > 0 && (
        <View style={styles.lines}>
          {lines.map(line => (
            <View key={line.label} style={styles.line}>
              <PretendardText style={styles.lineLabel}>{line.label}</PretendardText>
              <PretendardText style={styles.lineValue}>{line.value}</PretendardText>
            </View>
          ))}
        </View>
      )}
      {isPending ? (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.applyButton,
              primary ? styles.applyPrimary : styles.applySecondary,
              applyDisabled && styles.disabled,
            ]}
            onPress={() => onApply(action)}
            disabled={applyDisabled}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('assistant.action.applyA11y', { title })}
            accessibilityState={{ disabled: applyDisabled }}
          >
            <PretendardText weight='semibold' style={styles.applyLabel}>
              {l10n.t('assistant.action.apply')}
            </PretendardText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.skipButton, applyDisabled && styles.disabled]}
            onPress={() => onSkip(action)}
            disabled={applyDisabled}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('assistant.action.skipA11y', { title })}
            accessibilityState={{ disabled: applyDisabled }}
          >
            <PretendardText weight='medium' style={styles.skipLabel}>
              {l10n.t('assistant.action.skip')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusRow}>
          {isApplying && <ActivityIndicator size='small' color={Acg.textMuted} />}
          <PretendardText
            weight='medium'
            style={[styles.statusText, isFailed && styles.statusFailed]}
            accessibilityLiveRegion='polite'
          >
            {getStatusText(action)}
          </PretendardText>
          {status === AssistantActionStatus.Applied && createdBagId && (
            <TouchableOpacity
              style={styles.viewTrip}
              onPress={() => onViewTrip(createdBagId)}
              accessibilityRole='link'
            >
              <PretendardText weight='semibold' style={styles.viewTripLabel}>
                {l10n.t('assistant.action.viewTrip')}
              </PretendardText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    // 면은 컨트롤에만(Feed §9·HM-8) — 테두리 없이 채움 면, 그림자 없음. 막힘 안내와 같은 문법.
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  heading: {
    gap: 4,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  summary: {
    ...AcgType.body,
    color: Acg.textSecondary,
  },
  lines: {
    gap: 6,
  },
  line: {
    flexDirection: 'row',
    gap: 12,
  },
  lineLabel: {
    ...AcgType.meta,
    color: Acg.textMuted,
    minWidth: 64,
  },
  lineValue: {
    ...AcgType.meta,
    color: Acg.ink,
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyButton: {
    minHeight: BUTTON_HEIGHT,
    minWidth: 88,
    paddingHorizontal: 20,
    borderRadius: BUTTON_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyPrimary: {
    backgroundColor: Acg.lime,
  },
  applySecondary: {
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.ink,
  },
  applyLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  skipButton: {
    minHeight: BUTTON_HEIGHT,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  skipLabel: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: BUTTON_HEIGHT,
  },
  statusText: {
    ...AcgType.meta,
    color: Acg.textSecondary,
  },
  statusFailed: {
    color: Acg.error,
  },
  viewTrip: {
    minHeight: BUTTON_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  viewTripLabel: {
    ...AcgType.control,
    color: Acg.ink,
    textDecorationLine: 'underline',
  },
});

export default observer(AssistantActionCardView);
