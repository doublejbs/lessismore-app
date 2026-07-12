const {
  withInfoPlist,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

// 네이버 지도 신규 NCP Maps 키(2024-04-17 이후 발급) 인증 설정.
// mj-studio 래퍼 v1의 기본 plugin은 구형 CLIENT_ID(NMFClientId) 방식만 지원하는데,
// 신규 키는 SDK 3.21+ 의 NCP_KEY_ID(NMFNcpKeyId) 방식이 필요해 직접 주입한다.
// 네이티브 SDK 3.21.0 상향은 patches/의 patch-package 패치가 담당한다
// (Android gradle.properties·brotli 제외, iOS podspec — 루트 gradle property는
// 라이브러리 자체 gradle.properties에 밀려 무효라 patch 방식만 유효).

const withNaverMapNcpKey = (config, { ncpKeyId }) => {
  if (!ncpKeyId) {
    throw new Error('WithNaverMapNcpKey: ncpKeyId 옵션이 필요합니다');
  }

  config = withInfoPlist(config, config => {
    delete config.modResults.NMFClientId;
    config.modResults.NMFNcpKeyId = ncpKeyId;

    return config;
  });

  config = withAndroidManifest(config, config => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    if (mainApplication['meta-data']) {
      mainApplication['meta-data'] = mainApplication['meta-data'].filter(
        item => item.$['android:name'] !== 'com.naver.maps.map.CLIENT_ID'
      );
    }

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'com.naver.maps.map.NCP_KEY_ID',
      ncpKeyId
    );

    return config;
  });

  return config;
};

module.exports = withNaverMapNcpKey;
