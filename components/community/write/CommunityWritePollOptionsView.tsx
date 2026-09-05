import { observer } from 'mobx-react-lite';
import {
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType, Radius } from '@/constants/DesignTokens';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import { formatCommunityDate } from '@/model/community/CommunityFormat';
import app from '@/model/app/App';
import {
  COMMUNITY_POLL_MAX_OPTIONS,
  COMMUNITY_POLL_MIN_OPTIONS,
  COMMUNITY_POLL_OPTION_MAX_LENGTH,
} from '@/model/community/CommunityLimits';

interface Props {
  write: CommunityWrite;
}

const EXPIRY_DAYS = [0, 1, 3, 7] as const;

/**
 * 투표 선택지와 마감 프리셋을 입력하는 View다(CM-5, CM-9).
 * 투표 게시글의 사진은 별도 커뮤니티 세션에 저장되어 개인 장비 사진과 분리된다.
 */
const CommunityWritePollOptionsView = ({ write }: Props) => {
  const l10n = app.getL10n();
  const canEdit = write.canEditPollStructure();
  const pollOptions = write.getPollOptions();

  const getExpiryLabel = (days: number): string => {
    if (days === 0) {
      return l10n.t('community.write.poll.expiresNone');
    }

    return l10n.t(`community.write.poll.expires${days}d`);
  };

  const isSelected = (days: number): boolean => {
    return write.getPollExpiryDays() === days;
  };
  const hasCustomExpiry = Boolean(write.getPollExpiresAt()) &&
    !EXPIRY_DAYS.includes(write.getPollExpiryDays() as (typeof EXPIRY_DAYS)[number]);

  return (
    <View style={styles.container}>
      {pollOptions.map((option, index) => (
        <View key={write.getPollOptionId(index)} style={styles.optionRow}>
          <View style={styles.optionHeader}>
            <PretendardText style={styles.label} weight='semibold'>
              {l10n.t('community.write.poll.option', { count: index + 1 })}
            </PretendardText>
            <PretendardText style={styles.counter}>
              {l10n.t('community.write.counter', {
                count: option.length,
                max: COMMUNITY_POLL_OPTION_MAX_LENGTH,
              })}
            </PretendardText>
            {pollOptions.length > COMMUNITY_POLL_MIN_OPTIONS && canEdit && !write.getIsSubmitting() && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => write.removePollOption(index)}
                disabled={write.getIsSubmitting()}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('community.write.poll.removeOption', {
                  count: index + 1,
                })}
              >
                <PretendardText style={styles.removeText}>
                  {l10n.t('community.write.poll.removeOption', {
                    count: index + 1,
                  })}
                </PretendardText>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={[styles.input, !canEdit && styles.disabled]}
            value={option}
            onChangeText={(value) => write.setPollOption(index, value)}
            placeholder={l10n.t('community.write.poll.option', {
              count: index + 1,
            })}
            placeholderTextColor={Acg.textMuted}
            maxLength={COMMUNITY_POLL_OPTION_MAX_LENGTH}
            editable={canEdit && !write.getIsSubmitting()}
          />
        </View>
      ))}
      {canEdit && pollOptions.length < COMMUNITY_POLL_MAX_OPTIONS && !write.getIsSubmitting() && (
        <TouchableOpacity
          style={styles.addOption}
          onPress={() => write.addPollOption()}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('community.write.poll.addOption')}
        >
          <Ionicons name='add' size={18} color={Acg.ink} />
          <PretendardText style={styles.addOptionText} weight='semibold'>
            {l10n.t('community.write.poll.addOption')}
          </PretendardText>
        </TouchableOpacity>
      )}
      <View style={styles.switchRow}>
        <PretendardText style={styles.switchLabel} weight='medium'>
          {l10n.t('community.write.poll.allowMultiple')}
        </PretendardText>
        <Switch
          value={write.getPollAllowMultiple()}
          onValueChange={(value) => write.setPollAllowMultiple(value)}
          disabled={!canEdit || write.getIsSubmitting()}
          trackColor={{ false: Acg.hairline, true: Acg.ink }}
          thumbColor={Acg.paper}
          ios_backgroundColor={Acg.hairline}
          accessibilityLabel={l10n.t('community.write.poll.allowMultiple')}
        />
      </View>
      <PretendardText style={styles.expiresLabel} weight='semibold'>
        {l10n.t('community.write.poll.expires')}
      </PretendardText>
      <View style={styles.chips}>
        {EXPIRY_DAYS.map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.chip, isSelected(days) && styles.chipSelected]}
            onPress={() => write.setPollExpiryDays(days)}
            disabled={!canEdit || write.getIsSubmitting()}
            accessibilityRole='button'
            accessibilityState={{ selected: isSelected(days), disabled: !canEdit }}
          >
            <PretendardText
              style={[styles.chipText, isSelected(days) && styles.chipTextSelected]}
            >
              {getExpiryLabel(days)}
            </PretendardText>
          </TouchableOpacity>
        ))}
        {hasCustomExpiry && write.getPollExpiresAt() && (
          <TouchableOpacity
            style={[styles.chip, styles.chipSelected]}
            disabled
            accessibilityRole='button'
            accessibilityState={{ selected: true, disabled: true }}
          >
            <PretendardText style={[styles.chipText, styles.chipTextSelected]}>
              {l10n.t('community.write.poll.expiresCustom', {
                date: formatCommunityDate(write.getPollExpiresAt()!),
              })}
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
      {!canEdit && (
        <PretendardText style={styles.locked}>
          {l10n.t('community.write.poll.locked')}
        </PretendardText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  optionRow: {
    gap: 4,
  },
  optionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
    flex: 1,
  },
  removeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  removeText: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  input: {
    minHeight: 48,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    // 단일행 입력 — lineHeight 제외(iOS 상하 치우침 방지)
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    color: Acg.ink,
  },
  disabled: {
    opacity: 0.55,
  },
  counter: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  addOption: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Acg.hairline,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
  },
  addOptionText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  // 복수 선택 허용은 켬/끔 설정이라 칩(선택지)이 아닌 스위치로 둔다(알림 설정 행과 같은 문법).
  switchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  expiresLabel: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  chipSelected: {
    backgroundColor: Acg.ink,
  },
  chipText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  chipTextSelected: {
    color: Acg.paper,
  },
  locked: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default observer(CommunityWritePollOptionsView);
