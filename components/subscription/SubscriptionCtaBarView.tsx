import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';

// 주 액션 알약 높이(HIG 44pt 이상, 다른 시트의 주 액션과 같은 값).
const PRIMARY_BUTTON_HEIGHT = 48;

interface Props {
  label: string;
  canSubscribe: boolean;
  isPurchasing: boolean;
  onSubscribe: () => void;
  // 바 높이를 알린다 — 스크롤 콘텐츠 하단 패딩을 이만큼 둔다.
  onHeightChange: (height: number) => void;
}

/**
 * SUB-2 하단 고정 바 — 스크롤 위에 떠 있는 순백 면 + 위 헤어라인. 라임 알약(화면의 유일한 라임, HM-8) +
 * 메타 `언제든 해지할 수 있어요`. 구매 중이면 막고 진행 표시, 상품을 불러오지 못했으면 연회색으로 비활성.
 */
const SubscriptionCtaBarView = ({
  label,
  canSubscribe,
  isPurchasing,
  onSubscribe,
  onHeightChange,
}: Props) => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const isDimmed = !canSubscribe && !isPurchasing;

  const handleLayout = (event: LayoutChangeEvent) => {
    onHeightChange(event.nativeEvent.layout.height);
  };

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, Spacing.item) },
      ]}
      onLayout={handleLayout}
    >
      <TouchableOpacity
        style={[styles.primaryButton, isDimmed && styles.primaryButtonDisabled]}
        onPress={onSubscribe}
        disabled={!canSubscribe}
        activeOpacity={0.85}
        accessibilityRole='button'
        accessibilityLabel={
          isPurchasing ? l10n.t('subscription.purchasing') : label
        }
        accessibilityState={{ disabled: !canSubscribe, busy: isPurchasing }}
      >
        {isPurchasing ? (
          <ActivityIndicator color={Acg.ink} />
        ) : (
          <PretendardText
            weight='semibold'
            style={[
              styles.primaryLabel,
              isDimmed && styles.primaryLabelDisabled,
            ]}
          >
            {label}
          </PretendardText>
        )}
      </TouchableOpacity>

      <PretendardText style={styles.meta}>
        {l10n.t('subscription.cancelAnytime')}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.hairline,
    paddingTop: Spacing.item,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  primaryButton: {
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
    paddingVertical: (PRIMARY_BUTTON_HEIGHT - AcgType.control.lineHeight) / 2,
  },
  // 상품을 불러오지 못했을 때 — 라임을 거두고 연회색 면으로 누를 수 없음을 보인다.
  primaryButtonDisabled: {
    backgroundColor: Acg.controlFill,
  },
  primaryLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  primaryLabelDisabled: {
    color: Acg.textMuted,
  },
  meta: {
    ...AcgType.meta,
    color: Acg.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.item / 2,
  },
});

export default SubscriptionCtaBarView;
