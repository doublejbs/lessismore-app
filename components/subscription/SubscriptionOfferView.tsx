import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SubscriptionOfferingStatus from '@/model/subscription/SubscriptionOfferingStatus';
import SubscriptionRestoreButtonView from './SubscriptionRestoreButtonView';

const PRIMARY_BUTTON_HEIGHT = 48;
// HIG 최소 터치 타깃.
const MIN_TOUCH_SIZE = 44;

// 혜택 아이콘 타일(연회색 면 + 모서리 12, HM-8)과 아이콘 크기.
const BENEFIT_ICON_TILE_SIZE = 40;
const BENEFIT_ICON_SIZE = 22;

interface Props {
  offeringStatus: SubscriptionOfferingStatus;
  priceString: string | null;
  // SUB-10: 체험 자격이 확인됐을 때만 true. 모르거나 조회에 실패하면 false(자격 없음으로 그린다).
  isTrialEligible: boolean;
  // SUB-11: 오프라인 타일 게이트에서 열었는지 — 제목 아래 안내 한 줄을 더하고 오프라인 혜택을 맨 앞에 둔다.
  isOfflineEntry: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  onSubscribe: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onOpenTerms: () => void;
  onOpenPrivacyPolicy: () => void;
}

// SUB-2 미구독: 제목 `useless 플러스` · 혜택(아이콘 + 두 줄) · 가격 줄(SDK 현지화 값) · 주 액션(라임, 화면의
// 주 액션 하나) · 구매 복원 · (체험이면 체험 안내) · 자동 갱신 안내 · 약관 링크. 가격·기간·자동 갱신·해지
// 방법·약관 링크·구매 복원은 App Store 심사 필수 표시다(3.1.2) — 빠뜨리지 않는다.
// SUB-10: 체험 자격이 있으면 `7일 무료 체험 후 월 {가격}`·`7일 무료로 시작`, 없으면 `월 {가격}`·`구독하기`.
// SUB-11: 오프라인 진입점 변형은 제목 아래 안내 한 줄을 더한다. 혜택은 지금 오프라인 저장 하나라 오프라인
// 줄이 언제나 맨 앞이다 — 혜택을 더하면 오프라인 진입점에서는 오프라인 줄을 맨 앞에 둔다.
const SubscriptionOfferView = ({
  offeringStatus,
  priceString,
  isTrialEligible,
  isOfflineEntry,
  isPurchasing,
  isRestoring,
  onSubscribe,
  onRestore,
  onRetry,
  onOpenTerms,
  onOpenPrivacyPolicy,
}: Props) => {
  const l10n = app.getL10n();
  const isBusy = isPurchasing || isRestoring;
  const isPriceReady =
    offeringStatus === SubscriptionOfferingStatus.Ready && priceString !== null;
  const canSubscribe = isPriceReady && !isBusy;
  const subscribeLabel = isTrialEligible
    ? l10n.t('subscription.startTrial')
    : l10n.t('subscription.subscribe');

  const renderPrice = () => {
    if (offeringStatus === SubscriptionOfferingStatus.Error) {
      return (
        <View style={styles.priceErrorRow}>
          <PretendardText style={styles.priceError}>
            {l10n.t('subscription.priceError')}
          </PretendardText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.retry')}
          >
            <PretendardText weight='medium' style={styles.retryLabel}>
              {l10n.t('common.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    if (offeringStatus !== SubscriptionOfferingStatus.Ready || !priceString) {
      return (
        <View style={styles.priceLoading}>
          <ActivityIndicator color={Acg.ink} />
        </View>
      );
    }

    return (
      <PretendardText weight='semibold' style={styles.price}>
        {isTrialEligible
          ? l10n.t('subscription.trialPrice', { price: priceString })
          : l10n.t('subscription.price', { price: priceString })}
      </PretendardText>
    );
  };

  // SUB-10: 체험이 끝나면 자동으로 청구된다는 안내(심사 필수 표시 — 3.1.2). 가격 줄 바로 아래.
  const renderTrialNotice = () => {
    if (!isTrialEligible || !isPriceReady) {
      return null;
    }

    return (
      <PretendardText style={styles.trialNotice}>
        {l10n.t('subscription.trialNotice', { price: priceString })}
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
        {l10n.t('subscription.title')}
      </PretendardText>

      {isOfflineEntry ? (
        <PretendardText style={styles.lead}>
          {l10n.t('subscription.offlineEntryLead')}
        </PretendardText>
      ) : null}

      <View style={styles.benefitRow}>
        <View style={styles.benefitIconTile}>
          <Ionicons
            name='cloud-download-outline'
            size={BENEFIT_ICON_SIZE}
            color={Acg.ink}
          />
        </View>
        <View style={styles.benefitTextColumn}>
          <PretendardText weight='medium' style={styles.benefitTitle}>
            {l10n.t('subscription.benefitOfflineTitle')}
          </PretendardText>
          <PretendardText style={styles.benefitDetail}>
            {l10n.t('subscription.benefitOfflineDetail')}
          </PretendardText>
        </View>
      </View>

      <View style={styles.priceSlot}>{renderPrice()}</View>

      {renderTrialNotice()}

      {/* 화면의 주 액션 — 라임 알약 + 잉크 글자(HM-8). */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          !canSubscribe && !isPurchasing && styles.primaryButtonDisabled,
        ]}
        onPress={onSubscribe}
        disabled={!canSubscribe}
        activeOpacity={0.85}
        accessibilityRole='button'
        accessibilityLabel={
          isPurchasing ? l10n.t('subscription.purchasing') : subscribeLabel
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
              !canSubscribe && styles.primaryLabelDisabled,
            ]}
          >
            {subscribeLabel}
          </PretendardText>
        )}
      </TouchableOpacity>

      <View style={styles.restoreSlot}>
        <SubscriptionRestoreButtonView
          isRestoring={isRestoring}
          disabled={isPurchasing}
          onRestore={onRestore}
        />
      </View>

      <PretendardText style={styles.notice}>
        {l10n.t('subscription.autoRenewNotice')}
      </PretendardText>

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
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  lead: {
    ...AcgType.body,
    color: Acg.ink,
    marginTop: Spacing.item,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: Spacing.item,
    marginTop: Spacing.section,
  },
  benefitIconTile: {
    width: BENEFIT_ICON_TILE_SIZE,
    height: BENEFIT_ICON_TILE_SIZE,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextColumn: {
    flex: 1,
  },
  benefitTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  benefitDetail: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  // 가격·오류·불러오는 중이 같은 높이를 차지해 시트 높이가 튀지 않게 한다.
  priceSlot: {
    marginTop: Spacing.section,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
  },
  price: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
  },
  trialNotice: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  priceLoading: {
    alignItems: 'flex-start',
  },
  priceErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: Spacing.item,
  },
  priceError: {
    ...AcgType.rowSubtitle,
    color: Acg.textSecondary,
    flexShrink: 1,
  },
  retryButton: {
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
  },
  retryLabel: {
    ...AcgType.control,
    color: Acg.ink,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    marginTop: Spacing.item,
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
    paddingVertical: (PRIMARY_BUTTON_HEIGHT - AcgType.control.lineHeight) / 2,
  },
  // 상품을 불러오지 못했을 때(SUB-2) — 라임을 거두고 연회색 면으로 누를 수 없음을 보인다.
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
  restoreSlot: {
    marginTop: Spacing.item / 2,
  },
  notice: {
    ...AcgType.meta,
    color: Acg.textSecondary,
    marginTop: Spacing.item,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: Spacing.item / 2,
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

export default SubscriptionOfferView;
