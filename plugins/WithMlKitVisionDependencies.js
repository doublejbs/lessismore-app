const { withAndroidManifest } = require('expo/config-plugins');

// expo-dev-launcher(barcode_ui)와 @six33/react-native-bg-removal(subject_segment)이
// 같은 메타데이터를 서로 다른 값으로 선언해 매니페스트 병합이 실패하므로,
// 앱 매니페스트에서 두 값을 합쳐 tools:replace로 덮어쓴다.
const ML_KIT_DEPENDENCIES_NAME = 'com.google.mlkit.vision.DEPENDENCIES';
const ML_KIT_DEPENDENCIES_VALUE = 'barcode_ui,subject_segment';

const withMlKitVisionDependencies = (config) =>
  withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    manifest.$ = manifest.$ ?? {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.application?.[0];

    if (!application) {
      throw new Error('AndroidManifest.xml에 application 요소가 없습니다.');
    }

    application['meta-data'] = application['meta-data'] ?? [];

    const existing = application['meta-data'].find(
      (item) => item.$?.['android:name'] === ML_KIT_DEPENDENCIES_NAME
    );

    if (existing) {
      existing.$['android:value'] = ML_KIT_DEPENDENCIES_VALUE;
      existing.$['tools:replace'] = 'android:value';
    } else {
      application['meta-data'].push({
        $: {
          'android:name': ML_KIT_DEPENDENCIES_NAME,
          'android:value': ML_KIT_DEPENDENCIES_VALUE,
          'tools:replace': 'android:value',
        },
      });
    }

    return modConfig;
  });

module.exports = withMlKitVisionDependencies;
