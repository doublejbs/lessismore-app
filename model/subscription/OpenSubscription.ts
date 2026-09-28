import { router } from 'expo-router';
import app from '@/model/app/App';
import SubscriptionEntryPoint from './SubscriptionEntryPoint';

// SUB-3·SUB-8·SUB-9: 구독 화면(SUB-2)을 여는 한 곳. 설정 행·광고 아래 링크·한 번 뜨는 안내가 함께 쓴다.
// 구매는 로그인한 사용자만 하므로 비로그인이면 로그인으로 보내고 진입을 남기지 않는다.
export const openSubscription = (from: SubscriptionEntryPoint) => {
  if (!app.getFirebase().isLoggedIn()) {
    app.getLogInAlertManager()?.show();

    return;
  }

  app.getAnalyticsManager()?.logClick('subscription_open', { from });
  router.push('/subscription');
};
