import { FC } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AiGearFill from '@/model/ai-gear-fill/AiGearFill';

interface Props {
  aiGearFill: AiGearFill;
  onApply: () => void;
  onRetry: () => void;
}

const APPLY_HEIGHT = 48;
const NUMBER_PATTERN = /(\d+(?:\.\d+)?)/;

// 문구 안의 숫자만 콘덴스드로 그린다(`3개 선택 · +2.45kg`의 3·2.45) — 한글엔 콘덴스드 글리프가 없다.
const renderWithCondensedNumbers = (text: string) =>
  text.split(NUMBER_PATTERN).map((part, index) =>
    NUMBER_PATTERN.test(part) ? (
      <AcgDisplayText key={index} style={styles.summaryNumber}>
        {part}
      </AcgDisplayText>
    ) : (
      part
    )
  );

/**
 * 하단 고정 바(AS-14·AS-15): 좌 `{n}개 선택 · +{kg}kg`, 우 라임 알약 `담기`(화면의 라임은 이것 하나).
 * 그 아래 작은 줄 `다시 추천` · `오늘 {n}회 남음`. 카탈로그 장비를 고르면 바 위에 창고 저장 안내(§6),
 * 저장 실패면 바 위에 실패 문구(선택 유지).
 */
const AiGearFillFooterView: FC<Props> = ({ aiGearFill, onApply, onRetry }) => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const count = aiGearFill.getSelectedCount();
  const applying = aiGearFill.isApplying();
  const applyDisabled = count === 0 || applying;
  const remaining = aiGearFill.getRemaining();
  const retryDisabled = !aiGearFill.canRetry();
  const summary = l10n.t('aiGearFill.selectedSummary', {
    count,
    kg: aiGearFill.getSelectedWeightKg(),
  });
  const applyLabel = l10n.t('aiGearFill.apply');

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {aiGearFill.hasApplyFailed() ? (
        <PretendardText style={styles.error} accessibilityRole='alert'>
          {l10n.t('aiGearFill.applyFailed')}
        </PretendardText>
      ) : aiGearFill.hasSelectedCatalog() ? (
        <PretendardText style={styles.notice}>
          {l10n.t('aiGearFill.catalogNotice')}
        </PretendardText>
      ) : null}

      <View style={styles.bar}>
        <PretendardText
          style={styles.summary}
          weight='medium'
          numberOfLines={1}
          accessibilityLabel={summary}
        >
          {renderWithCondensedNumbers(summary)}
        </PretendardText>
        <TouchableOpacity
          style={[styles.apply, count === 0 && styles.applyDisabled]}
          onPress={onApply}
          disabled={applyDisabled}
          activeOpacity={0.85}
          accessibilityRole='button'
          accessibilityLabel={applyLabel}
          accessibilityState={{ disabled: applyDisabled, busy: applying }}
        >
          {applying ? (
            <ActivityIndicator color={Acg.ink} />
          ) : (
            <PretendardText
              weight='semibold'
              style={[
                styles.applyLabel,
                count === 0 && styles.applyLabelDisabled,
              ]}
            >
              {applyLabel}
            </PretendardText>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.subRow}>
        <TouchableOpacity
          style={styles.retry}
          onPress={onRetry}
          disabled={retryDisabled}
          accessibilityRole='button'
          accessibilityState={{ disabled: retryDisabled }}
        >
          <PretendardText
            weight='medium'
            style={[styles.subText, retryDisabled && styles.subTextDisabled]}
          >
            {l10n.t('aiGearFill.retry')}
          </PretendardText>
        </TouchableOpacity>
        {remaining !== null ? (
          <>
            <PretendardText style={styles.subText}>·</PretendardText>
            <PretendardText style={styles.subText}>
              {l10n.t('aiGearFill.remaining', { count: remaining })}
            </PretendardText>
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 화면에 고정된 바라 그림자 없이 헤어라인으로만 목록과 가른다.
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    backgroundColor: Acg.paper,
    gap: 8,
  },
  notice: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  error: {
    ...AcgType.meta,
    color: Acg.error,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summary: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    flex: 1,
  },
  summaryNumber: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  apply: {
    minHeight: APPLY_HEIGHT,
    minWidth: 112,
    borderRadius: APPLY_HEIGHT,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  applyDisabled: {
    backgroundColor: Acg.controlFill,
  },
  applyLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  applyLabelDisabled: {
    color: Acg.textMuted,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
  },
  subText: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  // 남은 횟수 0 — 회색 글자에 반투명을 더해 누를 수 없음을 구분한다.
  subTextDisabled: {
    color: Acg.textMuted,
    opacity: 0.5,
  },
});

export default observer(AiGearFillFooterView);
