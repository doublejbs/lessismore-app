import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  onClose: () => void;
  // 담는 중에는 닫기를 막는다(AS-15) — 저장이 끝나면 시트가 스스로 닫힌다.
  disabled?: boolean;
}

const CLOSE_SIZE = 44;

// 시트 머리(AS-14): pageSheet라 OS 그래버가 없어 공용 그래버를 그리고, 하단 `담기`가 주 액션이라
// 적용하지 않고 나가는 길로 우상단 ×를 둔다(README 시트 이탈 경로).
const AiGearFillHeaderView: FC<Props> = ({ onClose, disabled = false }) => {
  const l10n = app.getL10n();

  return (
    <View>
      <SheetGrabberView />
      <View style={styles.row}>
        <PretendardText
          style={styles.title}
          weight='semibold'
          accessibilityRole='header'
        >
          {l10n.t('aiGearFill.title')}
        </PretendardText>
        <TouchableOpacity
          style={styles.close}
          onPress={onClose}
          disabled={disabled}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('common.close')}
          accessibilityState={{ disabled }}
        >
          <Ionicons
            name='close'
            size={24}
            color={disabled ? Acg.textMuted : Acg.ink}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: AcgLayout.screenPadding,
    paddingRight: AcgLayout.screenPadding - (CLOSE_SIZE - 24) / 2,
    paddingVertical: 4,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    flex: 1,
  },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AiGearFillHeaderView;
