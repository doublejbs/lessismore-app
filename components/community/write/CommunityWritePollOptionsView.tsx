import { observer } from 'mobx-react-lite';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType, Color } from '@/constants/DesignTokens';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import app from '@/model/app/App';

interface Props {
  write: CommunityWrite;
}

const EXPIRY_DAYS = [0, 1, 3, 7];

/**
 * 투표 선택지와 마감 프리셋을 입력하는 View다(CM-5, CM-9).
 * 투표 게시글의 사진은 별도 커뮤니티 세션에 저장되어 개인 장비 사진과 분리된다.
 */
const CommunityWritePollOptionsView = ({ write }: Props) => {
  const l10n = app.getL10n();
  const canEdit = write.canEditPollStructure();

  const getExpiryLabel = (days: number): string => {
    if (days === 0) {
      return l10n.t('community.write.poll.expiresNone');
    }

    return l10n.t(`community.write.poll.expires${days}d`);
  };

  const isSelected = (days: number): boolean => {
    return write.pollExpiryDays === days;
  };

  return (
    <View style={styles.container}>
      {write.pollOptions.map((option, index) => (
        <View key={index} style={styles.optionRow}>
          <View style={styles.optionHeader}>
            <PretendardText style={styles.label} weight='semibold'>
              {l10n.t('community.write.poll.option', { count: index + 1 })}
            </PretendardText>
            {write.pollOptions.length > 2 && canEdit && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => write.removePollOption(index)}
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
            placeholderTextColor={Color.textSecondary}
            maxLength={60}
            editable={canEdit}
          />
          <PretendardText style={styles.counter}>
            {l10n.t('community.write.counter', {
              count: option.length,
              max: 60,
            })}
          </PretendardText>
        </View>
      ))}
      {canEdit && write.pollOptions.length < 4 && (
        <TouchableOpacity
          style={styles.addOption}
          onPress={() => write.addPollOption()}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('community.write.poll.addOption')}
        >
          <PretendardText style={styles.addOptionText} weight='semibold'>
            {l10n.t('community.write.poll.addOption')}
          </PretendardText>
        </TouchableOpacity>
      )}
      <PretendardText style={styles.expiresLabel} weight='semibold'>
        {l10n.t('community.write.poll.expires')}
      </PretendardText>
      <View style={styles.chips}>
        {EXPIRY_DAYS.map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.chip, isSelected(days) && styles.chipSelected]}
            onPress={() => write.setPollExpiryDays(days)}
            disabled={!canEdit}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
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
    color: Color.textSecondary,
  },
  input: {
    minHeight: 48,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...AcgType.control,
    color: Acg.ink,
  },
  disabled: {
    opacity: 0.55,
  },
  counter: {
    ...AcgType.meta,
    color: Acg.textMuted,
    alignSelf: 'flex-end',
  },
  addOption: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  addOptionText: {
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
    color: Color.background,
  },
  locked: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
});

export default observer(CommunityWritePollOptionsView);
