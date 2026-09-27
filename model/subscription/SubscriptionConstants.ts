// SUB-1: RevenueCat 권한(entitlement). 이 권한이 살아 있으면 구독 중이다(SUB-4).
export const NO_ADS_ENTITLEMENT_ID = 'no_ads';

// SUB-4: 앱 시작 직후 SDK가 구독 상태를 알려 주기를 기다리는 최대 시간. 넘기면 미구독으로 보고
// 광고를 요청한다 — 이후 구독으로 확인되면 받은 광고를 해제하고 자리를 접는다.
export const SUBSCRIPTION_RESOLVE_TIMEOUT_MS = 3000;

// SUB-5: `구독 관리` — 스토어의 구독 관리 화면.
export const IOS_MANAGE_SUBSCRIPTIONS_URL =
  'https://apps.apple.com/account/subscriptions';

export const ANDROID_MANAGE_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?package=com.doublejbs.useless&sku=useless_no_ads_monthly';
