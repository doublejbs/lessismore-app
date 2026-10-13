import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SubscriptionRestoreButtonView from './SubscriptionRestoreButtonView';

// HIG 최소 터치 타깃.
const MIN_TOUCH_SIZE = 44;

interface Props {
  isPurchasing: boolean;
  isRestoring: boolean;
  onRestore: () => void;
  onOpenTerms: () => void;
  onOpenPrivacyPolicy: () => void;
}

/**
 * SUB-2 ⑦ 심사 필수 표시(App Store 3.1.2) — 스크롤 맨 아래에 자동 갱신 안내 · `구매 복원` · 이용약관 ·
 * 개인정보 처리방침. 빠뜨리지 않는다.
 */
const SubscriptionLegalView = ({
  isPurchasing,
  isRestoring,
  onRestore,
  onOpenTerms,
  onOpenPrivacyPolicy,
}: Props) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.container}>
      <PretendardText style={styles.notice}>
        {l10n.t('subscription.autoRenewNotice')}
      </PretendardText>

      <SubscriptionRestoreButtonView
        isRestoring={isRestoring}
        disabled={isPurchasing}
        onRestore={onRestore}
      />

      <View style={styles.links}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={onOpenTerms}
          activeOpacity={0.7}
          accessibilityRole='link'
        >
          <PretendardText style={styles.linkLabel}>
            {l10n.t('info.policy.terms')}
          </PretendardText>
        </TouchableOpacity>
        <PretendardText style={styles.linkSeparator}>
          {l10n.t('common.metaSeparator')}
        </PretendardText>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={onOpenPrivacyPolicy}
          activeOpacity={0.7}
          accessibilityRole='link'
        >
          <PretendardText style={styles.linkLabel}>
            {l10n.t('info.policy.privacy')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    rowGap: Spacing.item / 2,
  },
  notice: {
    ...AcgType.meta,
    color: Acg.textSecondary,
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  linkButton: {
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
  },
  linkLabel: {
    ...AcgType.meta,
    color: Acg.ink,
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    ...AcgType.meta,
    color: Acg.textSecondary,
  },
});

export default SubscriptionLegalView;
