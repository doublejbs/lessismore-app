const { withAndroidManifest } = require('expo/config-plugins');

// react-native-health-connect의 자체 플러그인은 권한 rationale용 intent-filter만 넣고
// uses-permission 선언은 넣지 않는다(앱마다 요청 범위가 다르기 때문).
// 선언이 없으면 requestPermission()이 사용자에게 시트를 띄우지 못하고 그대로 거부된다.
//
// 요청 범위는 HA-2의 "표시하는 것만 요청" 원칙을 따라 HealthConnectService가 실제로
// 읽는 항목으로 한정한다.
//
// 경로 권한(READ_EXERCISE_ROUTE)은 **일부러 빠져 있다.** 코드가 requestExerciseRoute()를
// 부르지 않아(상세 진입마다 시스템 동의 다이얼로그가 뜨는 문제 — HealthConnectService의
// readRoute() 주석 참고) 요청하지 않는 권한인데, Google Play는 선언된 권한마다 정당화를
// 요구한다. 소명할 근거가 없는 선언은 심사 마찰만 부르고 위 원칙과도 모순된다.
// **되살릴 조건**: 상세에 명시적인 `경로 불러오기` 액션을 붙여 그 뒤에서만
// requestExerciseRoute()를 호출하게 될 때. 그때 아래 배열에 단수형을 다시 넣는다
// (전체 경로를 일괄로 읽는 복수형 READ_EXERCISE_ROUTES는 별도 심사 대상이라 다른 결정이다).
const HEALTH_PERMISSIONS = [
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.READ_DISTANCE',
  'android.permission.health.READ_ELEVATION_GAINED',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_HEART_RATE',
];

const withHealthConnectPermissions = config =>
  withAndroidManifest(config, modConfig => {
    const manifest = modConfig.modResults.manifest;

    manifest['uses-permission'] = manifest['uses-permission'] ?? [];

    HEALTH_PERMISSIONS.forEach(name => {
      // prebuild가 반복 실행되거나 다른 플러그인이 같은 권한을 넣었을 수 있어 중복을 막는다.
      const exists = manifest['uses-permission'].some(
        item => item.$?.['android:name'] === name
      );

      if (exists) {
        return;
      }

      manifest['uses-permission'].push({ $: { 'android:name': name } });
    });

    return modConfig;
  });

module.exports = withHealthConnectPermissions;
