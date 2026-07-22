const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// Podfile에 `use_modular_headers!` 를 주입한다.
//
// 왜 필요한가: Firebase의 Swift 팟(FirebaseCoreInternal·AppCheckCore)은 의존하는
// GoogleUtilities 등이 모듈맵을 정의하지 않아, static library 로 빌드하려면
// 모듈맵 생성이 필요하다. 예전에는 이걸 expo-build-properties 의
// `ios.useFrameworks: "static"` 으로 우회했는데, **New Architecture 에서는 그 조합이
// RNFBMessaging 헤더를 깨뜨린다**:
//   RCTPromiseRejectBlock ... must be imported from module 'RNFBApp.RNFBAppModule'
// CocoaPods 가 직접 제시하는 대안이 `use_modular_headers!` 이며, 이쪽은 New Arch 에서
// 정상 빌드된다. 따라서 useFrameworks 를 제거하고 이 플러그인을 쓴다.
//
// ios/ 는 gitignore(managed 워크플로우, prebuild 로 재생성)라 Podfile 을 직접 고치면
// 유지되지 않는다 — config plugin 으로 매 prebuild 마다 주입해야 한다.
const ANCHOR = 'use_expo_modules!';
const DIRECTIVE = 'use_modular_headers!';

const withPodfileModularHeaders = config =>
  withDangerousMod(config, [
    'ios',
    async config => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      const contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(DIRECTIVE)) {
        return config;
      }

      if (!contents.includes(ANCHOR)) {
        throw new Error(
          `WithPodfileModularHeaders: Podfile 에서 '${ANCHOR}' 앵커를 찾지 못했습니다. Expo 템플릿이 바뀌었는지 확인하세요.`
        );
      }

      const injected = contents.replace(
        ANCHOR,
        `${DIRECTIVE}\n\n  ${ANCHOR}`
      );

      fs.writeFileSync(podfilePath, injected);

      return config;
    },
  ]);

module.exports = withPodfileModularHeaders;
