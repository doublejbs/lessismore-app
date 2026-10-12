import { router } from 'expo-router';
import app from '@/model/app/App';
import SubscriptionEntryPoint from './SubscriptionEntryPoint';

export interface OpenSubscriptionOptions {
  // SUB-11: 이 진입으로 연 구독 화면에서 권한(`premium`, 체험 포함)이 생겼을 때 **시트가 닫힌 뒤** 한 번
  // 부른다 — 구매(체험 시작) 성공, 또는 구매 복원으로 권한이 살아났을 때. 취소·실패·결제 승인 대기·
  // 그냥 닫기면 부르지 않는다. 오프라인 진입점은 여기서 그 여행의 저장을 시작한다(OF-2).
  onEntitled?: () => void;
}

// 지금 열린 구독 화면이 권한을 얻으면 부를 콜백. 구독 화면은 한 번에 하나만 뜬다.
let pendingEntitledCallback: (() => void) | null = null;

/**
 * SUB-3·SUB-8·SUB-11: 구독 화면(SUB-2)을 여는 한 곳. 설정 행·오프라인 타일 게이트가 함께 쓴다
 * (광고 쪽 진입점 SUB-9는 `[보류]`).
 *
 * - 구매는 로그인한 사용자만 하므로 비로그인이면 로그인으로 보내고 진입을 남기지 않는다(콜백도 버린다).
 * - `from`은 라우트 파라미터로도 넘긴다 — 구독 화면은 이 문자열로 변형을 고른다(`offline`이면 오프라인
 *   진입점 변형, SUB-11).
 * - **완료 신호**: `options.onEntitled`. 예) 오프라인 타일 게이트
 *   `openSubscription(SubscriptionEntryPoint.Offline, { onEntitled: () => startSave(bag) })`.
 *   구독 화면이 열릴 때 `takeEntitledCallback()`으로 꺼내 들고, 권한을 얻으면 시트를 닫고 토스트를 띄운 뒤
 *   부른다. 권한 없이 닫히면 화면과 함께 버려진다 — 다음 진입으로 새지 않는다.
 */
export const openSubscription = (
  from: SubscriptionEntryPoint,
  options: OpenSubscriptionOptions = {}
) => {
  if (!app.getFirebase().isLoggedIn()) {
    app.getLogInAlertManager()?.show();

    return;
  }

  pendingEntitledCallback = options.onEntitled ?? null;
  app.getAnalyticsManager()?.logClick('subscription_open', { from });
  router.push({ pathname: '/subscription', params: { from } });
};

// 구독 화면이 열릴 때 한 번 꺼내 들고 있는다(꺼낸 뒤 비운다). 화면이 권한 없이 닫히면 함께 버려진다.
export const takeEntitledCallback = (): (() => void) | null => {
  const callback = pendingEntitledCallback;

  pendingEntitledCallback = null;

  return callback;
};
