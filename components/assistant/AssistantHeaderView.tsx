import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Assistant from '@/model/assistant/Assistant';
import { formatTripPeriod } from '@/model/assistant/AssistantActionPresentation';

interface Props {
  assistant: Assistant;
  onNewChat: () => void;
  onClose: () => void;
}

const TOUCH_SIZE = 44;

// 헤더(AS-3·§2) — 좌측 `새 대화`, 가운데 타이틀, 우측 닫기 ×. 아래에 대상 줄(`새 여행` / `{이름} · {기간}`).
const AssistantHeaderView: FC<Props> = ({ assistant, onNewChat, onClose }) => {
  const l10n = app.getL10n();
  const trip = assistant.getTrip();
  const target = trip
    ? `${trip.name}${l10n.t('common.metaSeparator')}${formatTripPeriod(trip.startDate, trip.endDate)}`
    : l10n.t('assistant.target.new');
  // 적용 중에는 비우지 않는다 — 적용 결과가 새 대화에 섞이지 않게.
  const canReset = !assistant.isEmpty() && !assistant.isApplying();

  return (
    <View style={styles.container}>
      <SheetGrabberView />
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.side}
          onPress={onNewChat}
          disabled={!canReset}
          accessibilityRole='button'
          accessibilityState={{ disabled: !canReset }}
        >
          <PretendardText
            weight='medium'
            style={[styles.newChat, !canReset && styles.newChatDisabled]}
          >
            {l10n.t('assistant.newChat')}
          </PretendardText>
        </TouchableOpacity>
        <PretendardText
          weight='semibold'
          style={styles.title}
          accessibilityRole='header'
          numberOfLines={1}
        >
          {l10n.t('assistant.title')}
        </PretendardText>
        <View style={[styles.side, styles.sideRight]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.close')}
          >
            <Ionicons name='close' size={24} color={Acg.ink} />
          </TouchableOpacity>
        </View>
      </View>
      <PretendardText
        style={styles.target}
        numberOfLines={1}
        accessibilityLabel={l10n.t('assistant.target.a11y', { target })}
      >
        {target}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
    backgroundColor: Acg.paper,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_SIZE,
  },
  side: {
    flex: 1,
    minHeight: TOUCH_SIZE,
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  newChat: {
    ...AcgType.control,
    color: Acg.ink,
  },
  newChatDisabled: {
    color: Acg.textMuted,
  },
  // 다른 시트 제목 단과 같은 22 semibold.
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  closeButton: {
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  target: {
    ...AcgType.meta,
    color: Acg.textMuted,
    textAlign: 'center',
  },
});

export default observer(AssistantHeaderView);
