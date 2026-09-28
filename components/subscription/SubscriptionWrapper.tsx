import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import SubscriptionView from './SubscriptionView';

// SUB-2: 구독 시트의 래퍼. 구독 기능이 꺼져 있으면(웹·공개 키 없음·옛 바이너리) 시트를 닫는다 —
// 설정 행이 숨어 있어 평소에는 들어올 수 없다(웹에서 주소로 바로 들어오면 돌아갈 곳이 없어 홈으로).
// 미구독이면 열릴 때 월 패키지(가격)를 불러온다 — 이미 받은 가격은 다시 받는 동안에도 그대로 보인다.
const SubscriptionWrapper = () => {
  const router = useRouter();
  const store = app.getSubscriptionStore();
  const isAvailable = store.isAvailable();
  const isSubscribed = store.isSubscribed();

  useEffect(() => {
    if (isAvailable) {
      return;
    }

    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace('/');
  }, [isAvailable, router]);

  useEffect(() => {
    if (!isAvailable || isSubscribed) {
      return;
    }

    void store.loadOffering();
  }, [isAvailable, isSubscribed, store]);

  if (!isAvailable) {
    return null;
  }

  return <SubscriptionView store={store} />;
};

export default observer(SubscriptionWrapper);
