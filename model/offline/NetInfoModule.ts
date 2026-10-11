import { NativeModules, TurboModuleRegistry } from 'react-native';

// OF-3: 연결 상태 SDK(`@react-native-community/netinfo`)를 **쓸 때 처음** 싣는다. 2.0.2 바이너리에서
// 들어온 네이티브 모듈이라, 이 번들이 옛 바이너리에 실리면 SDK가 import 시점에
// `TurboModuleRegistry.getEnforcing('RNCNetInfo')`로 던진다 — require 전에 네이티브 모듈이 있는지부터
// 보고, 없으면 연결 감지 없이 간다(늘 온라인으로 본다). 웹은 `NetInfoModule.web.ts`.
export type NetInfo = typeof import('@react-native-community/netinfo');

// SDK가 찾는 네이티브 모듈 이름(`netinfo/src/internal/nativeModule.ts`). SDK를 올리면 다시 맞춘다.
const NETINFO_NATIVE_MODULE = 'RNCNetInfo';

let netInfo: NetInfo | null | undefined;

const hasNetInfoNativeModule = (): boolean => {
  try {
    return (
      TurboModuleRegistry.get(NETINFO_NATIVE_MODULE) != null ||
      NativeModules[NETINFO_NATIVE_MODULE] != null
    );
  } catch {
    return false;
  }
};

export const loadNetInfo = (): NetInfo | null => {
  if (netInfo !== undefined) {
    return netInfo;
  }

  if (!hasNetInfoNativeModule()) {
    netInfo = null;

    return netInfo;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    netInfo = require('@react-native-community/netinfo') as NetInfo;
  } catch {
    netInfo = null;
  }

  return netInfo;
};
