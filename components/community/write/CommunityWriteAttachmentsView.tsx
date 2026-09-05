import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType, Radius } from '@/constants/DesignTokens';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import CommunityWriteBagSelectView from './CommunityWriteBagSelectView';
import CommunityWritePollOptionsView from './CommunityWritePollOptionsView';
import app from '@/model/app/App';

interface Props {
  write: CommunityWrite;
}

/**
 * 작성 글의 선택적 패킹·투표 첨부 영역이다(CM-2, CM-4, CM-5, CM-9).
 * 첨부하지 않은 항목은 알약 버튼으로, 첨부한 항목은 입력 블록으로 표시한다.
 */
const CommunityWriteAttachmentsView = ({ write }: Props) => {
  const l10n = app.getL10n();
  const [bagSheetVisible, setBagSheetVisible] = useState(false);
  const hasBagSnapshot = write.hasBagSnapshot();
  const hasPoll = write.getHasPoll();
  const canEditPollStructure = write.canEditPollStructure();
  const isSubmitting = write.getIsSubmitting();

  const renderAttachButton = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity
        style={styles.attachButton}
        onPress={onPress}
        disabled={isSubmitting}
        accessibilityRole='button'
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={18} color={Acg.ink} />
        <PretendardText style={styles.attachButtonText} weight='semibold'>
          {label}
        </PretendardText>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <PretendardText style={styles.label} weight='semibold'>
        {l10n.t('community.write.attachments.label')}
      </PretendardText>
      <View style={styles.buttons}>
        {!hasBagSnapshot &&
          renderAttachButton(
            'bag-outline',
            l10n.t('community.write.attachments.packing'),
            () => setBagSheetVisible(true)
          )}
        {!hasPoll &&
          renderAttachButton(
            'stats-chart-outline',
            l10n.t('community.write.attachments.poll'),
            () => write.attachPoll()
          )}
      </View>
      <CommunityWriteBagSelectView
        write={write}
        summaryOnly
        sheetVisible={bagSheetVisible}
        onSheetVisibleChange={setBagSheetVisible}
        onRemove={() => write.clearBagSnapshot()}
      />
      {hasPoll && (
        <View style={styles.pollBlock}>
          <View style={styles.pollHeader}>
            <PretendardText style={styles.pollTitle} weight='semibold'>
              {l10n.t('community.write.attachments.poll')}
            </PretendardText>
            {canEditPollStructure && (
              <TouchableOpacity
                style={styles.textAction}
                onPress={() => write.detachPoll()}
                disabled={isSubmitting}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('community.write.attachments.removePoll')}
              >
                <PretendardText style={styles.textActionLabel}>
                  {l10n.t('community.write.attachments.removePoll')}
                </PretendardText>
              </TouchableOpacity>
            )}
          </View>
          <CommunityWritePollOptionsView write={write} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Acg.hairline,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
  },
  attachButtonText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  pollBlock: {
    gap: 12,
    padding: 16,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  pollHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pollTitle: {
    ...AcgType.control,
    color: Acg.ink,
  },
  textAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  textActionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(CommunityWriteAttachmentsView);
