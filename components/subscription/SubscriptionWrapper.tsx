import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import SubscriptionView from './SubscriptionView';

// SUB-2: 구독 시트의 래퍼. 구독 기능이 꺼져 있으면(웹·공개 키 없음·옛 바이너리) 시트를 닫는다 —
// 설정 행이 숨어 있어 평소에는 들어올 수 없다(웹에서 주소로 바로 들어오면 돌아갈 곳이 없어 홈으로).
// 열릴 때 월 패키지(가격·체험 자격)를 불러온다 — 이미 받은 가격은 다시 받는 동안에도 그대로 보인다.
// 구독 중이어도 체험 중이면 불러온다(`무료 체험 중 · {종료일}부터 월 {가격}`, SUB-10).
const SubscriptionWrapper = () => {
  const router = useRouter();
  const store = app.getSubscriptionStore();
  const isAvailable = store.isAvailable();
  const shouldLoadOffering = !store.isSubscribed() || store.isTrial();

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
    if (!isAvailable || !shouldLoadOffering) {
      return;
    }

    void store.loadOffering();
  }, [isAvailable, shouldLoadOffering, store]);

  if (!isAvailable) {
    return null;
  }

  return <SubscriptionView store={store} />;
};

export default observer(SubscriptionWrapper);
