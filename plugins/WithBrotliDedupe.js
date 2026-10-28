const { withAppBuildGradle } = require('expo/config-plugins');

// maven 의존성 org.brotli:dec 를 제외한다.
//
// 왜 필요한가: hot-updater 가 org.brotli.dec-1.2.0.jar 를 파일 의존성으로 직접 번들하는데,
// expo(expo-fetch 의 TransparentCompressionInterceptor)는 org.brotli:dec:0.1.2 를 maven 으로 끌어온다.
// 두 경로가 같은 클래스(org.brotli.dec.*)를 제공해 :app:checkReleaseDuplicateClasses 가 실패한다.
//   > Duplicate class org.brotli.dec.BitReader found in modules dec-0.1.2.jar and org.brotli.dec-1.2.0.jar
// 런타임 클래스는 hot-updater 쪽 jar(신 버전)가 제공하므로 maven 쪽만 제외하면 된다.
//
// [이력] 처음엔 네이버 지도(com.naver.maps:map-sdk)가 0.1.2 를 끌어온다고 보고 만들었고,
// MapLibre 전환 때 네이버 지도와 함께 지웠다가 2.0.2 Android 빌드가 같은 오류로 실패해 되살렸다
// (2026-10-27). 네이버 지도가 없어도 expo 가 같은 의존성을 갖는다.
//
// 예전에는 patch-package 로 라이브러리의 android/build.gradle 을 직접 고쳤으나,
// 그 방식은 패치 파일명이 버전에 고정돼 지도 버전을 올릴 때마다 깨진다.
// app/build.gradle 의 configurations 에서 제외하면 버전과 무관하게 유지된다.
const MARKER = '// brotli 중복 클래스 제외 (WithBrotliDedupe)';
const SNIPPET = `
${MARKER}
configurations.all {
    exclude group: 'org.brotli', module: 'dec'
}
`;

const withBrotliDedupe = config =>
  withAppBuildGradle(config, modConfig => {
    const contents = modConfig.modResults.contents;

    if (contents.includes(MARKER)) {
      return modConfig;
    }

    if (modConfig.modResults.language !== 'groovy') {
      throw new Error(
        'WithBrotliDedupe: app/build.gradle 이 groovy 가 아닙니다(kts 미지원).'
      );
    }

    modConfig.modResults.contents = `${contents}\n${SNIPPET}`;

    return modConfig;
  });

module.exports = withBrotliDedupe;
