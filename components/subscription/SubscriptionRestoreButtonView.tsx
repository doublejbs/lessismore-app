import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

// HIG 최소 터치 타깃.
const MIN_TOUCH_SIZE = 44;

interface Props {
  isRestoring: boolean;
  disabled: boolean;
  onRestore: () => void;
}

// SUB-5: `구매 복원` — 면 없는 보조 텍스트 버튼(App Store 심사 필수 표시, 두 상태 모두에 둔다).
const SubscriptionRestoreButtonView = ({
  isRestoring,
  disabled,
  onRestore,
}: Props) => {
  const l10n = app.getL10n();
  const label = l10n.t('subscription.restore');

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onRestore}
      disabled={disabled || isRestoring}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{
        disabled: disabled || isRestoring,
        busy: isRestoring,
      }}
    >
      {isRestoring ? (
        <ActivityIndicator color={Acg.ink} />
      ) : (
        <PretendardText weight='medium' style={styles.label}>
          {label}
        </PretendardText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default SubscriptionRestoreButtonView;
