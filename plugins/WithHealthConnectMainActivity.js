const { withMainActivity } = require('expo/config-plugins');

// react-native-health-connect 의 권한 다이얼로그를 MainActivity 에 연결한다.
//
// 왜 필요한가: 이 라이브러리의 HealthConnectPermissionDelegate 는 requestPermission /
// requestRoutePermission 런처를 lateinit 으로 두고, setPermissionDelegate(activity) 가
// activity.registerForActivityResult(...) 로 초기화해야 비로소 쓸 수 있다.
// 그런데 registerForActivityResult 는 Activity 가 STARTED 되기 전(= onCreate 안)에서만
// 호출할 수 있으므로, 라이브러리는 앱이 직접 MainActivity.onCreate 에서
// setPermissionDelegate(this) 를 불러 주기를 요구한다(README 참고).
// 이 한 줄이 없으면 권한 요청 시점에 lateinit 런처가 비어 있어 앱이 크래시한다:
//   kotlin.UninitializedPropertyAccessException:
//     lateinit property requestPermission has not been initialized
//
// Expo managed 워크플로우라 android/ 는 gitignore(prebuild 로 재생성)라서 MainActivity.kt 를
// 직접 고치면 다음 prebuild 에서 사라진다. 그래서 config plugin 으로 매 prebuild 마다 주입한다.
//
// setPermissionDelegate(this) 는 기본 provider(com.google.android.apps.healthdata)를 쓴다.
// HealthConnectService 가 initialize()/getSdkStatus() 를 같은 기본 provider 로 부르므로
// 일부러 인자 없이 둔다.
const IMPORT_LINE =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';

const DELEGATE_CALL =
  'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

const withHealthConnectMainActivity = config =>
  withMainActivity(config, modConfig => {
    // Expo 템플릿이 Java 로 바뀌는 등 예상 밖 상황이면 조용히 통과시키지 않고 즉시 알린다.
    if (modConfig.modResults.language !== 'kt') {
      throw new Error(
        `WithHealthConnectMainActivity: MainActivity 가 Kotlin(kt) 이 아닙니다(language=${modConfig.modResults.language}).`
      );
    }

    let contents = modConfig.modResults.contents;

    // 멱등성: import 나 호출문이 이미 있으면 다시 넣지 않는다(중복 주입은 컴파일 에러).
    const hasImport = contents.includes(IMPORT_LINE);
    const hasCall = contents.includes(DELEGATE_CALL);

    if (hasImport && hasCall) {
      return modConfig;
    }

    // import 주입: package 선언 바로 다음 줄에 넣는다.
    if (!hasImport) {
      const packageMatch = contents.match(/^package .*$/m);

      if (!packageMatch) {
        throw new Error(
          'WithHealthConnectMainActivity: package 선언을 찾지 못했습니다. Expo 템플릿이 바뀌었을 수 있습니다.'
        );
      }

      const packageLine = packageMatch[0];

      contents = contents.replace(
        packageLine,
        `${packageLine}\n${IMPORT_LINE}`
      );
    }

    // 호출 주입: super.onCreate(...) 바로 다음 줄에 넣는다.
    // registerForActivityResult 는 activity 가 STARTED 되기 전에 호출돼야 하므로
    // super.onCreate() 직후가 안전하다.
    if (!hasCall) {
      const superCallMatch = contents.match(/^(\s*)super\.onCreate\([^)]*\)/m);

      if (!superCallMatch) {
        throw new Error(
          'WithHealthConnectMainActivity: super.onCreate 호출을 찾지 못했습니다. Expo 템플릿이 바뀌었을 수 있습니다.'
        );
      }

      const superCallLine = superCallMatch[0];
      const indent = superCallMatch[1];

      contents = contents.replace(
        superCallLine,
        `${superCallLine}\n${indent}${DELEGATE_CALL}`
      );
    }

    modConfig.modResults.contents = contents;

    return modConfig;
  });

module.exports = withHealthConnectMainActivity;
