import { useCallback, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import { takeEntitledCallback } from '@/model/subscription/OpenSubscription';
import PurchaseResult from '@/model/subscription/PurchaseResult';
import RestoreResult from '@/model/subscription/RestoreResult';
import SubscriptionStore from '@/model/subscription/SubscriptionStore';

// SUB-2·SUB-5·SUB-8: 구독 시트의 동작. 결과 알림은 시트를 닫은 뒤 토스트로 띄우고(시트 위에서는
// 아래 화면의 토스트가 가려진다), 시트에 머무는 알림은 시스템 알럿을 쓴다.
// SUB-11: 권한을 얻으면(구매·체험 시작·복원) 시트를 닫은 뒤 진입점이 넘긴 `onEntitled`를 부른다.
const useSubscriptionState = (store: SubscriptionStore) => {
  const router = useRouter();
  const l10n = app.getL10n();
  // 이 화면을 연 `openSubscription`의 완료 콜백. 열릴 때 한 번 꺼내 든다 — 권한 없이 닫히면 함께 버려진다.
  const [onEntitled] = useState(() => takeEntitledCallback());
  const hasNotifiedEntitledRef = useRef(false);
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

  // 시트를 닫고 토스트를 띄운 뒤, 진입점이 하려던 일(오프라인 진입점이면 그 여행 저장)을 잇는다. 한 번만.
  const closeAsEntitled = (message: string) => {
    closeWithToast(message);

    if (hasNotifiedEntitledRef.current) {
      return;
    }

    hasNotifiedEntitledRef.current = true;
    onEntitled?.();
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

    // SUB-8·SUB-10: 성공이면 체험으로 시작했는지(`is_trial`)를 함께 남긴다. `is_internal`(AN-1)과 같이
    // `'true'`/`'false'` 문자열로 둔다 — GA4 필터·비교가 쉽다.
    app
      .getAnalyticsManager()
      ?.logClick(
        'subscription_purchase',
        result === PurchaseResult.Success
          ? { result, is_trial: String(store.isTrial()) }
          : { result }
      );

    if (result === PurchaseResult.Success) {
      closeAsEntitled(l10n.t('subscription.purchaseSuccess'));

      return;
    }

    // 결제 승인 대기(Ask to Buy 등) — 승인되면 권한 리스너가 반영한다. 진입점의 일은 잇지 않는다.
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
      closeAsEntitled(l10n.t('subscription.restoreSuccess'));

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
