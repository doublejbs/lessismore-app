import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Acg, AcgLayout, Spacing } from '@/constants/DesignTokens';
import SubscriptionEntryPoint from '@/model/subscription/SubscriptionEntryPoint';
import SubscriptionStore from '@/model/subscription/SubscriptionStore';
import SubscriptionActiveView from './SubscriptionActiveView';
import SubscriptionCloseButtonView from './SubscriptionCloseButtonView';
import SubscriptionOfferView from './SubscriptionOfferView';
import useSubscriptionState from './useSubscriptionState';

// 닫기 ×를 화면 모서리에서 띄우는 거리(히어로 위 닫기와 같은 자리).
const CLOSE_BUTTON_EDGE_INSET = 16;

interface Props {
  store: SubscriptionStore;
}

// SUB-2: 구독 화면(전체 화면 모달, 2026-10-13 개정). 미구독이면 전체 화면 안내(히어로 + 하단 고정 바),
// 구독 중이면 히어로 없이 상단 닫기 × + 관리 상태를 그린다.
// SUB-11: 진입점은 `from` 파라미터 문자열로 읽는다(`openSubscription`) — `offline`이면 오프라인 진입점 변형,
// `route_draw`면 코스 그리기 진입점 변형(SUB-12), `satellite`면 위성 보기 진입점 변형(SUB-13).
const SubscriptionView = ({ store }: Props) => {
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isOfflineEntry = from === SubscriptionEntryPoint.Offline;
  // SUB-12: 코스 그리기 게이트에서 열었으면 코스 그리기 진입점 변형(안내 한 줄 + 기능 행 `코스 그리기`를 맨 위로).
  const isRouteDrawEntry = from === SubscriptionEntryPoint.RouteDraw;
  // SUB-13: 지도 종류 메뉴의 `위성`에서 열었으면 위성 진입점 변형(안내 한 줄 + 기능 행 `위성 지도`를 맨 위로).
  const isSatelliteEntry = from === SubscriptionEntryPoint.Satellite;
  const {
    formattedExpirationDate,
    handleSubscribe,
    handleRestore,
    handleManage,
    handleClose,
    handleRetry,
    handleOpenTerms,
    handleOpenPrivacyPolicy,
  } = useSubscriptionState(store, from);
  // 구매·복원 중에는 제스처로 닫지 못하게 한다 — 결과가 온 뒤 닫힌 화면 대신 아래 화면이
  // 닫히지 않게(SUB-2 진행 중 버튼 막기와 같은 이유).
  const isBusy = store.isPurchasing() || store.isRestoring();

  // 히어로가 없는 상태(상태 확인 중·구독 중)의 상단 닫기 ×.
  const renderPlainClose = () => (
    <View
      style={[styles.closeRow, { paddingTop: insets.top + Spacing.item / 2 }]}
    >
      <SubscriptionCloseButtonView
        isFloating={false}
        disabled={isBusy}
        onClose={handleClose}
      />
    </View>
  );

  const renderContent = () => {
    if (!store.isResolved()) {
      return (
        <>
          {renderPlainClose()}
          <View style={styles.resolving}>
            <ActivityIndicator color={Acg.ink} />
          </View>
        </>
      );
    }

    if (store.isSubscribed()) {
      return (
        <>
          {renderPlainClose()}
          <View
            style={[
              styles.activeBody,
              { paddingBottom: Math.max(insets.bottom, Spacing.section) },
            ]}
          >
            <SubscriptionActiveView
              willRenew={store.willRenewSubscription()}
              isTrial={store.isTrial()}
              priceString={store.getPriceString()}
              formattedExpirationDate={formattedExpirationDate}
              isRestoring={store.isRestoring()}
              onManage={handleManage}
              onRestore={handleRestore}
            />
          </View>
        </>
      );
    }

    return (
      <SubscriptionOfferView
        offeringStatus={store.getOfferingStatus()}
        priceString={store.getPriceString()}
        isTrialEligible={store.isTrialEligible()}
        isOfflineEntry={isOfflineEntry}
        isRouteDrawEntry={isRouteDrawEntry}
        isSatelliteEntry={isSatelliteEntry}
        isPurchasing={store.isPurchasing()}
        isRestoring={store.isRestoring()}
        onSubscribe={handleSubscribe}
        onRestore={handleRestore}
        onRetry={handleRetry}
        onOpenTerms={handleOpenTerms}
        onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
        onClose={handleClose}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ gestureEnabled: !isBusy }} />
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  closeRow: {
    paddingHorizontal: CLOSE_BUTTON_EDGE_INSET,
    alignItems: 'flex-start',
  },
  resolving: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBody: {
    paddingTop: Spacing.section,
    paddingHorizontal: AcgLayout.screenPadding,
  },
});

export default observer(SubscriptionView);
