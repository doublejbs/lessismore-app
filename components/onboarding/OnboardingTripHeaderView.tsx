import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  stepIndex: number;
  stepCount: number;
  canGoBack: boolean;
  disabled: boolean;
  onBack: () => void;
  onClose: () => void;
}

const BUTTON_SIZE = 44;

// 가이드 머리(OB-3): 왼쪽 뒤로(2~4단계) · 가운데 진행 막대 · 오른쪽 닫기 ×.
const OnboardingTripHeaderView: FC<Props> = ({
  stepIndex,
  stepCount,
  canGoBack,
  disabled,
  onBack,
  onClose,
}) => {
  const l10n = app.getL10n();
  const segments = Array.from({ length: stepCount }, (_, index) => index);

  return (
    <View style={styles.container}>
      {canGoBack ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onBack}
          disabled={disabled}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('onboarding.header.back')}
        >
          <Ionicons name='chevron-back' size={24} color={Acg.ink} />
        </TouchableOpacity>
      ) : (
        <View style={styles.button} />
      )}

      <View
        style={styles.progress}
        accessible
        accessibilityRole='progressbar'
        accessibilityLabel={l10n.t('onboarding.header.progress', {
          current: stepIndex + 1,
          total: stepCount,
        })}
      >
        {segments.map(index => (
          <View
            key={index}
            style={[
              styles.segment,
              index <= stepIndex && styles.segmentActive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={onClose}
        disabled={disabled}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('onboarding.header.close')}
      >
        <Ionicons name='close' size={24} color={Acg.ink} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // 버튼의 44pt 터치 영역이 화면 가장자리 패딩 안쪽에서 아이콘을 정렬하도록 10만큼 당긴다.
    paddingHorizontal: AcgLayout.screenPadding - 10,
    minHeight: 52,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 4,
    width: 120,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Acg.controlFill,
  },
  segmentActive: {
    backgroundColor: Acg.ink,
  },
});

export default observer(OnboardingTripHeaderView);
