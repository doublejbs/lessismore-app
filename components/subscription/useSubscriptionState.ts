import { useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import PurchaseResult from '@/model/subscription/PurchaseResult';
import RestoreResult from '@/model/subscription/RestoreResult';
import SubscriptionStore from '@/model/subscription/SubscriptionStore';

// SUB-2·SUB-5·SUB-8: 구독 시트의 동작. 결과 알림은 시트를 닫은 뒤 토스트로 띄우고(시트 위에서는
// 아래 화면의 토스트가 가려진다), 시트에 머무는 알림은 시스템 알럿을 쓴다.
const useSubscriptionState = (store: SubscriptionStore) => {
  const router = useRouter();
  const l10n = app.getL10n();
  // 시트가 아직 떠 있는지. 진행 중에는 스와이프 닫기를 막지만(SubscriptionView), 그래도 사라졌으면
  // `router.back()`이 아래 화면을 닫지 않게 한다.
  const isFocusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      return () => {
        isFocusedRef.current = false;
      };
    }, [])
  );

  const closeSheet = () => {
    if (isFocusedRef.current) {
      router.back();
    }
  };

  const closeWithToast = (message: string) => {
    closeSheet();
    app.getToastManager()?.show({ message });
  };

  // SUB-3: 구매·복원은 로그인한 사용자만 한다. 설정 행이 먼저 막지만, 시트가 열린 채 로그아웃된 경우를
  // 대비한다. 로그인이 필요하면 시트를 닫고 로그인을 띄운 뒤 true.
  const redirectToLoginIfNeeded = () => {
    if (app.getFirebase().isLoggedIn()) {
      return false;
    }

    closeSheet();
    app.getLogInAlertManager()?.show();

    return true;
  };

  const handleSubscribe = async () => {
    if (redirectToLoginIfNeeded()) {
      return;
    }

    const result = await store.purchase();

    app.getAnalyticsManager()?.logClick('subscription_purchase', { result });

    if (result === PurchaseResult.Success) {
      closeWithToast(l10n.t('subscription.purchaseSuccess'));

      return;
    }

    // 결제 승인 대기(Ask to Buy 등) — 승인되면 권한 리스너가 광고를 끈다.
    if (result === PurchaseResult.Pending) {
      Alert.alert(l10n.t('subscription.purchasePending'));

      return;
    }

    // 스토어 창에서 취소하면 아무 알림 없이 원래 화면(SUB-2).
    if (result === PurchaseResult.Error) {
      Alert.alert(l10n.t('subscription.purchaseError'));
    }
  };

  const handleRestore = async () => {
    if (redirectToLoginIfNeeded()) {
      return;
    }

    const result = await store.restore();

    app.getAnalyticsManager()?.logClick('subscription_restore', { result });

    if (result === RestoreResult.Restored) {
      closeWithToast(l10n.t('subscription.restoreSuccess'));

      return;
    }

    if (result === RestoreResult.None) {
      Alert.alert(l10n.t('subscription.restoreNone'));

      return;
    }

    Alert.alert(l10n.t('subscription.restoreError'));
  };

  const handleManage = () => {
    void Linking.openURL(store.getManageSubscriptionsUrl());
  };

  const handleRetry = () => {
    void store.loadOffering();
  };

  // 약관 화면은 스택 화면이라 시트 위에 쌓지 않고, 시트를 닫은 뒤 연다.
  const handleOpenTerms = () => {
    closeSheet();
    router.push('/info/policy?tab=terms');
  };

  const handleOpenPrivacyPolicy = () => {
    closeSheet();
    router.push('/info/policy?tab=privacy');
  };

  const expirationDate = store.getExpirationDate();
  const formattedExpirationDate = expirationDate
    ? dayjs(expirationDate).format(l10n.t('subscription.dateFormat'))
    : null;

  return {
    formattedExpirationDate,
    handleSubscribe,
    handleRestore,
    handleManage,
    handleRetry,
    handleOpenTerms,
    handleOpenPrivacyPolicy,
  };
};

export default useSubscriptionState;
