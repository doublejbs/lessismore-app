const { withAndroidManifest } = require('expo/config-plugins');

// expo-notifications는 앱 매니페스트에 firebase messaging의 기본 알림 색상 메타데이터
// (com.google.firebase.messaging.default_notification_color = @color/notification_icon_color)를
// 주입하는데, @react-native-firebase/messaging 라이브러리 매니페스트도 같은 키를
// @color/white로 선언해 매니페스트 병합이 실패한다.
// 앱(expo-notifications) 값이 이기도록 tools:replace로 덮어쓴다.
const FIREBASE_NOTIFICATION_COLOR_NAME =
  'com.google.firebase.messaging.default_notification_color';

const withFirebaseMessagingNotificationColor = (config) =>
  withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    manifest.$ = manifest.$ ?? {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';

    const application = manifest.application?.[0];

    if (!application) {
      throw new Error('AndroidManifest.xml에 application 요소가 없습니다.');
    }

    application['meta-data'] = application['meta-data'] ?? [];

    const existing = application['meta-data'].find(
      (item) => item.$?.['android:name'] === FIREBASE_NOTIFICATION_COLOR_NAME
    );

    if (existing) {
      existing.$['tools:replace'] = 'android:resource';
    } else {
      application['meta-data'].push({
        $: {
          'android:name': FIREBASE_NOTIFICATION_COLOR_NAME,
          'android:resource': '@color/notification_icon_color',
          'tools:replace': 'android:resource',
        },
      });
    }

    return modConfig;
  });

module.exports = withFirebaseMessagingNotificationColor;
