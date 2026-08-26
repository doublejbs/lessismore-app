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
// **READ_HEART_RATE는 두지 않는다** (2026-08-26 Play 정책 지적 — HA-7).
// 헬스 커넥트 권한 정책의 '최소 범위' 심사에서 "선언된 기능에 필요하지 않다"고 판정됐다.
// 심박수는 `활력 징후`(Vital signs) 카테고리라 민감도가 한 단 높게 취급된다.
// iOS(HealthKit)는 Apple 심사를 통과했으므로 그대로 유지한다 — 플랫폼별로 갈리는 지점이다.
const HEALTH_PERMISSIONS = [
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.READ_DISTANCE',
  'android.permission.health.READ_ELEVATION_GAINED',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
];

// Android 14+(API 34+)는 권한 요청 Intent를 처리할 activity-alias(ViewPermissionUsageActivity)가
// AndroidManifest에 있어야 권한 시트를 띄운다. 라이브러리 자체 플러그인은
// ACTION_SHOW_PERMISSIONS_RATIONALE intent-filter만 MainActivity에 넣고 이 alias는 넣지 않아,
// alias가 없으면 requestPermission()이 아무 반응 없이 조용히 시트를 띄우지 못한다(크래시 없이 거부).
// 그래서 라이브러리 공식 문서가 요구하는 alias를 <application>의 자식으로 직접 추가한다.
const VIEW_PERMISSION_USAGE_ALIAS_NAME = 'ViewPermissionUsageActivity';

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

    const application = manifest.application[0];

    application['activity-alias'] = application['activity-alias'] ?? [];

    // prebuild가 매번 android/를 재생성하지만, 방어적으로 이미 있으면 다시 넣지 않는다.
    const aliasExists = application['activity-alias'].some(
      item => item.$?.['android:name'] === VIEW_PERMISSION_USAGE_ALIAS_NAME
    );

    if (!aliasExists) {
      application['activity-alias'].push({
        $: {
          'android:name': VIEW_PERMISSION_USAGE_ALIAS_NAME,
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission':
            'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE',
                },
              },
            ],
            category: [
              {
                $: {
                  'android:name': 'android.intent.category.HEALTH_PERMISSIONS',
                },
              },
            ],
          },
        ],
      });
    }

    return modConfig;
  });

module.exports = withHealthConnectPermissions;
