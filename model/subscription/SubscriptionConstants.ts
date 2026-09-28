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

// SUB-9: 광고가 화면에 누적 이만큼 그려지면(자리 5곳 합산) 한 번 뜨는 안내 시트를 띄운다.
export const SUBSCRIPTION_NUDGE_IMPRESSION_THRESHOLD = 20;

// SUB-9: 안내를 띄우기 전 가격을 모르면 상품을 불러오며 이만큼만 기다린다 — 넘기면 가격 없는 문구로 띄운다.
export const SUBSCRIPTION_NUDGE_PRICE_WAIT_MS = 1500;

// SUB-9: 안내 시트를 요청한 뒤 이 안에 Modal이 뜨지 않으면(`onShow` 없음 — 다른 모달이 떠 있는 등)
// 요청을 거두고 다음 광고 때 다시 본다.
export const SUBSCRIPTION_NUDGE_SHOW_TIMEOUT_MS = 1000;

// SUB-9: `구독 알아보기` 뒤 시트가 다 내려갔다는 신호(iOS Modal `onDismiss`)가 이 안에 오지 않으면 그대로
// 구독 화면을 연다 — 신호를 놓쳐도 이동이 멈추지 않게 하는 안전판이다(평소에는 신호가 먼저 온다).
export const SUBSCRIPTION_NUDGE_OPEN_FALLBACK_MS = 800;
