import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SubscriptionRestoreButtonView from './SubscriptionRestoreButtonView';

const SECONDARY_BUTTON_HEIGHT = 48;

interface Props {
  willRenew: boolean;
  // 표시용으로 이미 현지화한 날짜. 만료가 없는 권한이면 null(날짜 줄을 그리지 않는다).
  formattedExpirationDate: string | null;
  isRestoring: boolean;
  onManage: () => void;
  onRestore: () => void;
}

// SUB-2 구독 중: `광고 제거 구독 중` · 다음 갱신일(해지 예약이면 `{날짜}까지 이용`) · 구독 관리 · 구매 복원.
// 관리는 스토어로 나가는 보조 동작이라 라임을 쓰지 않는다(연회색 알약, HM-8).
const SubscriptionActiveView = ({
  willRenew,
  formattedExpirationDate,
  isRestoring,
  onManage,
  onRestore,
}: Props) => {
  const l10n = app.getL10n();
  const manageLabel = l10n.t('subscription.manage');

  const renderPeriod = () => {
    if (!formattedExpirationDate) {
      return null;
    }

    return (
      <PretendardText style={styles.period}>
        {willRenew
          ? l10n.t('subscription.nextRenewal', {
              date: formattedExpirationDate,
            })
          : l10n.t('subscription.activeUntil', {
              date: formattedExpirationDate,
            })}
      </PretendardText>
    );
  };

  return (
    <View>
      <PretendardText
        weight='semibold'
        style={styles.title}
        accessibilityRole='header'
      >
        {l10n.t('subscription.subscribedTitle')}
      </PretendardText>

      {renderPeriod()}

      <TouchableOpacity
        style={styles.manageButton}
        onPress={onManage}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={manageLabel}
      >
        <PretendardText weight='semibold' style={styles.manageLabel}>
          {manageLabel}
        </PretendardText>
      </TouchableOpacity>

      <View style={styles.restoreSlot}>
        <SubscriptionRestoreButtonView
          isRestoring={isRestoring}
          disabled={false}
          onRestore={onRestore}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  period: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    marginTop: Spacing.item,
  },
  manageButton: {
    marginTop: Spacing.section,
    minHeight: SECONDARY_BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
    paddingVertical: (SECONDARY_BUTTON_HEIGHT - AcgType.control.lineHeight) / 2,
  },
  manageLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  restoreSlot: {
    marginTop: Spacing.item / 2,
  },
});

export default SubscriptionActiveView;
