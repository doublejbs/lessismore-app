import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
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
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SubscriptionOfferingStatus from '@/model/subscription/SubscriptionOfferingStatus';
import SubscriptionCtaBarView from './SubscriptionCtaBarView';
import SubscriptionFeatureListView from './SubscriptionFeatureListView';
import SubscriptionHeroView from './SubscriptionHeroView';
import SubscriptionLegalView from './SubscriptionLegalView';
import SubscriptionTrialTimelineView from './SubscriptionTrialTimelineView';
import useSubscriptionHeroContent from './useSubscriptionHeroContent';

// HIG 최소 터치 타깃.
const MIN_TOUCH_SIZE = 44;

// 배지(연회색 칩) 치수.
const BADGE_ICON_SIZE = 14;
const BADGE_PADDING_H = 12;
const BADGE_PADDING_V = 6;

interface Props {
  offeringStatus: SubscriptionOfferingStatus;
  priceString: string | null;
  // SUB-10: 체험 자격이 확인됐을 때만 true. 모르거나 조회에 실패하면 false(자격 없음으로 그린다).
  isTrialEligible: boolean;
  // SUB-11: 오프라인 타일 게이트에서 열었는지 — 제목 아래 안내 한 줄을 더한다.
  isOfflineEntry: boolean;
  // SUB-12: 코스 그리기 게이트에서 열었는지 — 제목 아래 안내 한 줄 + 기능 행 `코스 그리기`를 맨 위로.
  isRouteDrawEntry: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  onSubscribe: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onOpenTerms: () => void;
  onOpenPrivacyPolicy: () => void;
  onClose: () => void;
}

/**
 * SUB-2 미구독 — 전체 화면 안내(2026-10-13 개정). 세로 스크롤에 ① 히어로 ② 배지 ③ 제목 두 줄 ④ 가격 줄
 * ⑤ 체험 카드(자격 없으면 한 줄) ⑥ 기능 5행 ⑦ 심사 필수 표시를 쌓고, 하단 고정 바에 주 액션(라임 —
 * 화면에 하나)을 둔다. 스크롤 콘텐츠 하단 패딩은 바 높이만큼이다.
 *
 * - SUB-10: 제목·가격·체험 카드·버튼 문구가 체험 자격으로 갈린다. 상품·자격을 받기 전에는 제목과 체험
 *   카드 자리를 비워 둔다 — `구독하기` 문구가 `7일 무료로 시작`으로 뒤늦게 바뀌어 보이지 않게.
 * - 가격·기간·자동 갱신·해지 방법·약관 링크·구매 복원은 App Store 심사 필수 표시다(3.1.2).
 */
const SubscriptionOfferView = ({
  offeringStatus,
  priceString,
  isTrialEligible,
  isOfflineEntry,
  isRouteDrawEntry,
  isPurchasing,
  isRestoring,
  onSubscribe,
  onRestore,
  onRetry,
  onOpenTerms,
  onOpenPrivacyPolicy,
  onClose,
}: Props) => {
  const l10n = app.getL10n();
  const heroContent = useSubscriptionHeroContent();
  const [barHeight, setBarHeight] = useState(0);
  const isBusy = isPurchasing || isRestoring;
  const isPriceReady =
    offeringStatus === SubscriptionOfferingStatus.Ready && priceString !== null;
  // 상품(가격·체험 자격)을 받았거나 실패가 확정됐는지. 그 전에는 자격에 따라 갈리는 자리를 비워 둔다.
  const isOfferSettled =
    offeringStatus === SubscriptionOfferingStatus.Ready ||
    offeringStatus === SubscriptionOfferingStatus.Error;
  const canSubscribe = isPriceReady && !isBusy;
  const subscribeLabel = isTrialEligible
    ? l10n.t('subscription.startTrial')
    : l10n.t('subscription.subscribe');
  const headline = isTrialEligible
    ? `${l10n.t('subscription.headlineTrial1')}\n${l10n.t('subscription.headlineTrial2')}`
    : `${l10n.t('subscription.headlineNoTrial1')}\n${l10n.t('subscription.headlineNoTrial2')}`;

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

    if (!isPriceReady) {
      return <ActivityIndicator color={Acg.ink} />;
    }

    return (
      <PretendardText weight='medium' style={styles.price}>
        {isTrialEligible
          ? l10n.t('subscription.priceTrialLead', { price: priceString })
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

  // SUB-2 ⑤: 체험 자격이 있으면 체험 카드, 없으면 한 줄.
  const renderPlan = () => {
    if (isTrialEligible) {
      return <SubscriptionTrialTimelineView priceString={priceString} />;
    }

    return (
      <PretendardText style={styles.noTrialLine}>
        {l10n.t('subscription.noTrialLine')}
      </PretendardText>
    );
  };

  const settledVisibility = isOfferSettled ? null : styles.pending;
  const settledA11yProps = isOfferSettled
    ? {}
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: barHeight + Spacing.section }}
        showsVerticalScrollIndicator={false}
      >
        <SubscriptionHeroView
          content={heroContent}
          isCloseDisabled={isBusy}
          onClose={onClose}
        />

        <View style={styles.content}>
          <View style={styles.badge}>
            <Ionicons name='sparkles' size={BADGE_ICON_SIZE} color={Acg.ink} />
            <PretendardText weight='semibold' style={styles.badgeLabel}>
              {l10n.t('subscription.heroBadge')}
            </PretendardText>
          </View>

          <View style={settledVisibility} {...settledA11yProps}>
            <PretendardText
              weight='semibold'
              style={styles.headline}
              accessibilityRole='header'
            >
              {headline}
            </PretendardText>
          </View>

          {isOfflineEntry ? (
            <PretendardText style={styles.lead}>
              {l10n.t('subscription.offlineEntryLead')}
            </PretendardText>
          ) : null}

          {isRouteDrawEntry ? (
            <PretendardText style={styles.lead}>
              {l10n.t('subscription.routeDrawEntryLead')}
            </PretendardText>
          ) : null}

          <View style={styles.priceSlot}>{renderPrice()}</View>

          {renderTrialNotice()}

          <View
            style={[styles.planSlot, settledVisibility]}
            {...settledA11yProps}
          >
            {renderPlan()}
          </View>

          <View style={styles.features}>
            <SubscriptionFeatureListView routeDrawFirst={isRouteDrawEntry} />
          </View>

          <View style={styles.legal}>
            <SubscriptionLegalView
              isPurchasing={isPurchasing}
              isRestoring={isRestoring}
              onRestore={onRestore}
              onOpenTerms={onOpenTerms}
              onOpenPrivacyPolicy={onOpenPrivacyPolicy}
            />
          </View>
        </View>
      </ScrollView>

      <SubscriptionCtaBarView
        label={subscribeLabel}
        canSubscribe={canSubscribe}
        isPurchasing={isPurchasing}
        onSubscribe={onSubscribe}
        onHeightChange={setBarHeight}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: Spacing.item,
  },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: Spacing.item / 2,
    paddingHorizontal: BADGE_PADDING_H,
    paddingVertical: BADGE_PADDING_V,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  badgeLabel: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  headline: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    textAlign: 'center',
    marginTop: Spacing.item,
  },
  // 상품을 받기 전 — 자리는 지키고 보이지 않게(레이아웃이 뒤늦게 밀리지 않게).
  pending: {
    opacity: 0,
  },
  lead: {
    ...AcgType.body,
    color: Acg.ink,
    textAlign: 'center',
    marginTop: Spacing.item,
  },
  // 가격·오류·불러오는 중이 같은 높이를 차지해 아래가 튀지 않게 한다.
  priceSlot: {
    marginTop: Spacing.item,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  trialNotice: {
    ...AcgType.meta,
    color: Acg.textSecondary,
    textAlign: 'center',
  },
  priceErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  planSlot: {
    marginTop: Spacing.section,
  },
  noTrialLine: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  features: {
    marginTop: Spacing.section,
  },
  legal: {
    marginTop: Spacing.section,
  },
});

export default SubscriptionOfferView;
