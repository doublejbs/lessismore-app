import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  onDismiss: () => void;
}

const DISMISS_SIZE = 44;

// 첫 사용 안내 한 줄(AS-10) — 알럿 대신 근거 줄 위에 1회. ×로 닫으면 기기에 기록한다.
const AiGearFillNoticeView: FC<Props> = ({ onDismiss }) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.container}>
      <PretendardText style={styles.text}>
        {l10n.t('aiGearFill.notice')}
      </PretendardText>
      <TouchableOpacity
        style={styles.dismiss}
        onPress={onDismiss}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('aiGearFill.noticeDismiss')}
      >
        <Ionicons name='close' size={16} color={Acg.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    ...AcgType.meta,
    color: Acg.textMuted,
    flex: 1,
  },
  dismiss: {
    width: DISMISS_SIZE,
    height: DISMISS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -(DISMISS_SIZE - 16) / 2,
  },
});

export default AiGearFillNoticeView;
