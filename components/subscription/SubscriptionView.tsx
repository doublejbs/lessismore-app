import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Acg, AcgLayout, Spacing } from '@/constants/DesignTokens';
import SubscriptionStore from '@/model/subscription/SubscriptionStore';
import SubscriptionActiveView from './SubscriptionActiveView';
import SubscriptionOfferView from './SubscriptionOfferView';
import useSubscriptionState from './useSubscriptionState';

// 구독 상태를 알기 전 자리 높이 — 시트가 내용에 맞춰 커질 때 크게 튀지 않게.
const RESOLVING_MIN_HEIGHT = 160;

interface Props {
  store: SubscriptionStore;
}

// SUB-2: 구독 시트(formSheet, 내용 높이). 미구독이면 구독 안내, 구독 중이면 관리 상태를 그린다.
const SubscriptionView = ({ store }: Props) => {
  const insets = useSafeAreaInsets();
  const {
    formattedExpirationDate,
    handleSubscribe,
    handleRestore,
    handleManage,
    handleRetry,
    handleOpenTerms,
    handleOpenPrivacyPolicy,
  } = useSubscriptionState(store);
  // 구매·복원 중에는 시트를 스와이프로 닫지 못하게 한다 — 결과가 온 뒤 닫힌 시트 대신 아래 화면이
  // 닫히지 않게(SUB-2 진행 중 버튼 막기와 같은 이유).
  const isBusy = store.isPurchasing() || store.isRestoring();

  const renderContent = () => {
    if (!store.isResolved()) {
      return (
        <View style={styles.resolving}>
          <ActivityIndicator color={Acg.ink} />
        </View>
      );
    }

    if (store.isSubscribed()) {
      return (
        <SubscriptionActiveView
          willRenew={store.willRenewSubscription()}
          formattedExpirationDate={formattedExpirationDate}
          isRestoring={store.isRestoring()}
          onManage={handleManage}
          onRestore={handleRestore}
        />
      );
    }

    return (
      <SubscriptionOfferView
        offeringStatus={store.getOfferingStatus()}
        priceString={store.getPriceString()}
        isPurchasing={store.isPurchasing()}
        isRestoring={store.isRestoring()}
        onSubscribe={handleSubscribe}
        onRestore={handleRestore}
        onRetry={handleRetry}
        onOpenTerms={handleOpenTerms}
        onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Spacing.section) },
      ]}
    >
      <Stack.Screen options={{ gestureEnabled: !isBusy }} />
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Acg.paper,
    paddingTop: Spacing.section,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  resolving: {
    minHeight: RESOLVING_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(SubscriptionView);
