// SUB-1: RevenueCat 권한(entitlement). 이 권한이 살아 있으면(7일 무료 체험 포함) 구독 중이다 —
// 오프라인 저장 게이트(SUB-11)가 이 판단을 쓴다. 구 `no_ads`(2026-10-10 개정).
export const PREMIUM_ENTITLEMENT_ID = 'premium';

// SUB-1: 스토어 상품 ID(iOS·Android 같은 값). 가격·체험 자격은 SDK가 준 패키지에서 읽고, 이 값은
// 안드로이드 구독 관리 주소(`sku=`)에 쓴다.
export const PLUS_PRODUCT_ID = 'useless_plus_monthly';

// SUB-10: 체험 중 권한의 `periodType`(RevenueCat `PERIOD_TYPE.TRIAL`).
export const TRIAL_PERIOD_TYPE = 'TRIAL';

// SUB-9 `[보류 — 광고 미도입(2026-10-10)]`: 광고 쪽 구독 진입점(광고 아래 `광고 없이 보기` 링크·누적 노출 뒤
// 한 번 뜨는 안내 시트). 광고가 혜택이 아니므로 끈다 — 코드는 남겨 두고, 광고가 다시 혜택이 되면 켠다.
export const SUBSCRIPTION_AD_ENTRY_ENABLED = false;

// SUB-4·SUB-11: 앱 시작 직후 SDK가 구독 상태를 알려 주기를 기다리는 최대 시간. 넘기면 미구독으로 본다 —
// 이후 구독으로 확인되면 리스너가 바로 반영한다.
export const SUBSCRIPTION_RESOLVE_TIMEOUT_MS = 3000;

// SUB-10: 상품을 받은 뒤 체험 자격 조회를 기다리는 최대 시간. 넘기면 자격을 모르는 것(`Unknown`)으로 보고
// 체험 없는 문구로 가격 화면을 연다 — 조회가 멈춰도 로딩에 갇히지 않게.
export const TRIAL_ELIGIBILITY_TIMEOUT_MS = 3000;

// SUB-5: `구독 관리` — 스토어의 구독 관리 화면.
export const IOS_MANAGE_SUBSCRIPTIONS_URL =
  'https://apps.apple.com/account/subscriptions';

export const ANDROID_MANAGE_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?package=com.doublejbs.useless&sku=${PLUS_PRODUCT_ID}`;

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

// SUB-11: 권한을 얻어 시트를 닫은 뒤 시트가 이 안에 내려가지(화면 해제·포커스 잃음) 않으면, 진행 중인
// 상호작용이 끝나는 대로 진입점의 `onEntitled`를 부른다 — 신호를 놓쳐도 이어지는 일이 멈추지 않게 하는 안전판.
export const SUBSCRIPTION_ENTITLED_FALLBACK_MS = 800;
