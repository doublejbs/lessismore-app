const { withAppBuildGradle } = require('expo/config-plugins');

// app.json의 `expo.locales`(L10N-12)는 iOS `InfoPlist.strings`만 만드는 게 아니라
// **Android `res/values-b+<lang>/strings.xml`에도 같은 iOS 전용 키를 쏟아낸다**
// (NSPhotoLibraryUsageDescription 등). 그 키는 Android 기본 로케일(`values/strings.xml`)에
// 없으므로 lint의 `ExtraTranslation`이 **치명적 오류**로 잡아 release 빌드가 실패한다
// (2026-08-26 실측: `lintVitalRelease` 15 errors → 빌드 중단).
//
// **왜 리소스를 지우지 않고 규칙을 끄는가**: config plugin의 dangerous mod는 expo의
// locales 생성 **이전에** 실행돼(실측 확인) 지워도 다시 만들어진다. 순서로 이길 수 없다.
//
// **왜 규칙을 끄는 것이 이 경우엔 타당한가**: `ExtraTranslation`의 근거는 "기본 로케일에
// 없는 번역은 조회 시 크래시할 수 있다"인데, 이 문자열들은 **Android 코드가 조회하지 않는다**
// (권한 다이얼로그 문구는 OS가 제공하고, 헬스 커넥트 사유는 별도 화면 HA-2가 담당한다).
// 즉 규칙이 막으려는 위험이 이 앱에는 성립하지 않는다. 다른 lint 규칙은 그대로 둔다.
const LINT_BLOCK = `
    lint {
        // iOS 전용 권한 문구가 Android 로케일 리소스로 생성되는 expo locales 동작 때문이다.
        // 근거는 plugins/WithLintExtraTranslationDisabled.js 주석 참고.
        disable 'ExtraTranslation'
    }
`;

const withoutIosLocaleStrings = config =>
  withAppBuildGradle(config, modConfig => {
    if (modConfig.modResults.contents.includes("disable 'ExtraTranslation'")) {
      return modConfig;
    }

    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      /^android \{$/m,
      `android {${LINT_BLOCK}`
    );

    return modConfig;
  });

module.exports = withoutIosLocaleStrings;
