import { NativeModules } from 'react-native';

// SUB §5·AD-5와 같은 가드: 구독 SDK(`react-native-purchases`)를 **쓸 때 처음** 싣는다. 새 네이티브
// 모듈이라 이전 스토어 바이너리에 OTA로 이 번들이 가면 네이티브 모듈이 없다. 이 SDK는 import 시점에
// 던지지는 않지만, 모듈이 없으면 첫 호출에서 던지고 Expo Go 판정 등 부수 경로를 탄다 — require 전에
// 네이티브 모듈이 있는지부터 보고, 없으면 구독 기능 없이 간다(미구독). 웹은 `PurchasesModule.web.ts`.
export type Purchases = typeof import('react-native-purchases');

// SDK가 `NativeModules.RNPurchases`로 찾는 네이티브 모듈(`react-native-purchases/dist/purchases.js`).
// 신아키텍처에서는 interop 레이어가 같은 이름으로 노출한다. SDK를 올리면 이 이름도 다시 맞춘다.
const PURCHASES_NATIVE_MODULE = 'RNPurchases';

let purchases: Purchases | null | undefined;

const hasPurchasesNativeModule = (): boolean => {
  return NativeModules[PURCHASES_NATIVE_MODULE] != null;
};

export const loadPurchases = (): Purchases | null => {
  if (purchases !== undefined) {
    return purchases;
  }

  if (!hasPurchasesNativeModule()) {
    purchases = null;

    return purchases;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchases = require('react-native-purchases') as Purchases;
  } catch {
    purchases = null;
  }

  return purchases;
};
