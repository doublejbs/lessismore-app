import { FC, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';

interface Props {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  loading?: boolean;
  secondaryLabel?: string | undefined;
  onSecondary?: (() => void) | undefined;
  // 보조 버튼 아래 작은 링크 자리(환영 화면의 로그인 링크, OB-14).
  footnote?: ReactNode;
}

const PRIMARY_MIN_HEIGHT = 52;

// 가이드 하단(OB-3): 라임 주 액션 하나 + 그 아래 보조 텍스트 버튼(건너뛰기 등).
// 화면에 고정된 액션이라 그림자를 두지 않는다 — 콘텐츠 위에 떠 있지 않다(OB-10).
const OnboardingTripFooterView: FC<Props> = ({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  loading = false,
  secondaryLabel,
  onSecondary,
  footnote,
}) => {
  const insets = useSafeAreaInsets();
  const disabled = primaryDisabled || loading;

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <TouchableOpacity
        style={[styles.primary, primaryDisabled && styles.primaryDisabled]}
        onPress={onPrimary}
        disabled={disabled}
        activeOpacity={0.85}
        accessibilityRole='button'
        accessibilityLabel={primaryLabel}
        accessibilityState={{ disabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={Acg.ink} />
        ) : (
          <PretendardText
            weight='semibold'
            style={[
              styles.primaryLabel,
              primaryDisabled && styles.primaryLabelDisabled,
            ]}
          >
            {primaryLabel}
          </PretendardText>
        )}
      </TouchableOpacity>

      {secondaryLabel && onSecondary ? (
        <TouchableOpacity
          style={styles.secondary}
          onPress={onSecondary}
          disabled={loading}
          accessibilityRole='button'
          accessibilityState={{ disabled: loading }}
        >
          <PretendardText weight='medium' style={styles.secondaryLabel}>
            {secondaryLabel}
          </PretendardText>
        </TouchableOpacity>
      ) : null}
      {footnote}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    gap: 4,
    backgroundColor: Acg.paper,
  },
  primary: {
    minHeight: PRIMARY_MIN_HEIGHT,
    borderRadius: PRIMARY_MIN_HEIGHT,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryDisabled: {
    backgroundColor: Acg.controlFill,
  },
  primaryLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  primaryLabelDisabled: {
    color: Acg.textMuted,
  },
  secondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryLabel: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
});

export default observer(OnboardingTripFooterView);
