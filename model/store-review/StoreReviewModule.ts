import { requireOptionalNativeModule } from 'expo';

// `expo-store-review`가 붙인 네이티브 모듈 이름.
const STORE_REVIEW_NATIVE_MODULE = 'ExpoStoreReview';

// 이 앱이 쓰는 `expo-store-review` 함수만 좁혀 둔다.
export interface StoreReviewModule {
  isAvailableAsync: () => Promise<boolean>;
  requestReview: () => Promise<void>;
}

// undefined = 아직 로드 시도 전, null = 이 바이너리에 모듈 없음.
let storeReview: StoreReviewModule | null | undefined;

/**
 * APP-11 안전장치: 네이티브 모듈이 없는 바이너리(2.0.2 이하)에서도 크래시 없이 null을 돌려준다.
 * 패키지는 import 시점에 `requireNativeModule`(없으면 던진다)을 부르므로 정적 import하지 않고,
 * 먼저 모듈이 있는지 본 뒤 require를 try/catch로 감싼다 — try/catch만으로는 Metro가 모듈 평가 에러를
 * 치명 에러로 먼저 보고하므로 존재 확인이 앞서야 한다(GoogleMobileAdsModule과 같은 이유).
 */
export const loadStoreReview = (): StoreReviewModule | null => {
  if (storeReview !== undefined) {
    return storeReview;
  }

  if (!requireOptionalNativeModule(STORE_REVIEW_NATIVE_MODULE)) {
    storeReview = null;

    return storeReview;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storeReview = require('expo-store-review') as StoreReviewModule;
  } catch (error) {
    console.warn('앱 평가 모듈 로드 실패', error); // l10n-ignore: 개발자 로그
    storeReview = null;
  }

  return storeReview;
};
