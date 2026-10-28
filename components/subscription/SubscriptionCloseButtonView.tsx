import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Acg, AcgShadow } from '@/constants/DesignTokens';
import app from '@/model/app/App';

// HIG 최소 터치 타깃 = 원 지름.
const CLOSE_BUTTON_SIZE = 44;
const CLOSE_ICON_SIZE = 22;

interface Props {
  // 지도 위에 떠 있으면 true — 흰 원 + 그림자(지도 위 플로팅만 그림자, HM-8). 지면 위면 연회색 원, 그림자 없음.
  isFloating: boolean;
  disabled: boolean;
  onClose: () => void;
}

// SUB-2: 전체 화면 구독 안내의 닫기 ×. 구매·복원 중에는 막는다(결과가 오기 전에 화면이 사라지지 않게).
const SubscriptionCloseButtonView = ({
  isFloating,
  disabled,
  onClose,
}: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, isFloating ? styles.floating : styles.plain]}
      onPress={onClose}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={app.getL10n().t('common.close')}
      accessibilityState={{ disabled }}
    >
      <Ionicons name='close' size={CLOSE_ICON_SIZE} color={Acg.ink} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    borderRadius: CLOSE_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floating: {
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.chip,
  },
  plain: {
    backgroundColor: Acg.controlFill,
  },
});

export default SubscriptionCloseButtonView;
