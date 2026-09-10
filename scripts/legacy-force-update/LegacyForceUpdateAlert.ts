import { Alert, AppState, Linking, Platform } from 'react-native';

/**
 * 레거시(2.0.0 미만) 바이너리에 OTA로 심는 무조건 강제 업데이트 알럿이다(APP-7 레거시 전달 경로, 2026-09-10).
 *
 * - 이 파일은 각 라이브 appVersion과 같은 커밋 위에 그대로 복사되어 `app/_layout.tsx` 첫 줄에서
 *   부수효과 import 된다(`scripts/legacy-force-update/deploy-legacy-gate.sh`). 그 커밋에는 l10n·디자인 토큰·
 *   ForceUpdateManager가 없으므로 RN 코어 API와 하드코딩 문구만 쓴다.
 * - 이 번들은 `-t <그 appVersion>`으로만 배포되므로 버전 판정이 필요 없다(항상 표시).
 * - 닫기 경로가 없다: iOS 알럿은 버튼으로만 닫히고, Android는 `cancelable: false`로 뒤로가기·바깥 탭을 막는다.
 *   `확인`을 누르면 설치 안내 페이지를 열고 앱으로 돌아오면 다시 띄운다.
 */
const INSTALL_URL = 'https://lessismore-7e070.web.app/app-install';
const TITLE = '업데이트가 필요해요'; // l10n-ignore: 레거시 번들(l10n 없음)
const MESSAGE = `최신 버전에서 새 기능을 사용할 수 있어요.\n확인을 누르면 설치 안내 페이지로 이동합니다.\n\n${INSTALL_URL}`; // l10n-ignore: 레거시 번들(l10n 없음)
const CONFIRM = '확인'; // l10n-ignore: 레거시 번들(l10n 없음)
const FIRST_DELAY_MS = 1500;
const RESHOW_DELAY_MS = 800;

let isShowing = false;

const showAlert = () => {
  if (Platform.OS === 'web' || isShowing) {
    return;
  }

  isShowing = true;

  Alert.alert(
    TITLE,
    MESSAGE,
    [
      {
        text: CONFIRM,
        onPress: () => {
          isShowing = false;
          Linking.openURL(INSTALL_URL).catch(() => undefined);
          setTimeout(showAlert, RESHOW_DELAY_MS);
        },
      },
    ],
    { cancelable: false }
  );
};

if (Platform.OS !== 'web') {
  setTimeout(showAlert, FIRST_DELAY_MS);

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      setTimeout(showAlert, RESHOW_DELAY_MS);
    }
  });
}

export {};
