---
name: android-release
description: Android 프로덕션 .aab를 로컬에서 만들고 Google Play에 업로드한다. 사용자가 "안드로이드 빌드/업로드"를 요청할 때 쓴다.
---

# Android 프로덕션 릴리스

로컬에서 `.aab`를 만들고 Google Play의 트랙에 올린다. 빌드는 이 맥의 Gradle로 돌고,
업로드 인증은 Play 서비스 계정 키로 한다.

## 실행 전 확인

1. **저장소 루트에서 실행한다** — 워크트리가 아니라 `/Users/user/Documents/GitHub/lessismore-app`.
   `.env`·`.env.submit`이 루트에만 있다.
2. **버전을 먼저 정한다** — `app.json`의 `version`이 `versionName`이 된다. `versionCode`는
   `eas.json`의 `autoIncrement`가 원격에서 올린다(같은 `versionCode` 재업로드는 Play가 거부한다).
3. **어느 브랜치인지 말한다** — 릴리스 빌드는 현재 체크아웃된 브랜치에서 나온다.
   `develop`에 머지되지 않았다면 사용자에게 먼저 알린다.
4. **디스크 여유를 본다** — 네이티브 4개 ABI를 CMake로 굽는다. **15GB 이상 비워두고 시작할 것.**
   회수 대상: `~/Library/Developer/Xcode/DerivedData`, `~/.gradle/caches`(빌드 중엔 건드리지 말 것),
   `~/Library/Caches/Yarn`(이 프로젝트는 npm/pnpm을 쓴다), 이미 업로드한 옛 `.aab`/`.ipa`.

## 1. 빌드

```bash
cd /Users/user/Documents/GitHub/lessismore-app
npx eas-cli build --platform android --profile production --local --non-interactive
```

- 20~40분 걸린다. **백그라운드로 돌리고 완료 알림을 기다린다.** 짧은 주기로 폴링하지 않는다.
- 성공하면 저장소 루트에 `build-<타임스탬프>.aab`가 생긴다(약 128MB).
- **완료 후 매니페스트를 검증한다** — `versionName`·`versionCode`·`targetSdkVersion`과 권한 목록:

```bash
unzip -o -q build-<타임스탬프>.aab -d /tmp/aab 'base/manifest/AndroidManifest.xml'
python3 -c "
import re
d=open('/tmp/aab/base/manifest/AndroidManifest.xml','rb').read()
print(*sorted(set(re.findall(rb'android\.permission\.[A-Z_]+', d))), sep='\n')
"
```

매니페스트는 **바이너리 XML**이라 `grep`이 아니라 위처럼 바이트 검색으로 본다.

## 2. 업로드

```bash
.claude/skills/android-release/submit.sh build-<타임스탬프>.aab            # 내부 테스트(기본)
.claude/skills/android-release/submit.sh build-<타임스탬프>.aab production # 프로덕션
```

**기본은 내부 테스트 트랙이다.** 프로덕션은 사용자가 명시적으로 요청할 때만 쓴다.

### 이 스크립트가 필요한 이유

`eas submit`은 제출 인증 정보를 **`eas.json`에서만** 읽는다(iOS와 같은 제약 — `ios-release` 참고).
서비스 계정 키 경로를 커밋하고 싶지 않으므로, 스크립트가 실행 시점에 `.env.submit`(gitignore 대상)의
값으로 `eas.json`을 임시 패치하고 `trap`으로 되돌린다.

`--non-interactive` 없이 실행하면 EAS가 프롬프트를 띄우는데 **에이전트 셸에는 stdin이 없어 답할 수 없다**.

## 최초 1회 준비 (새 머신)

`.env.submit`(gitignore 대상)에 키 경로를 넣는다.

```
PLAY_SERVICE_ACCOUNT_KEY_PATH=$HOME/Library/Mobile Documents/com~apple~CloudDocs/claude/<키파일>.json
```

서비스 계정 키는 Play Console **개발자 계정 → API 액세스**(구 버전은 설정 아래)에서 Cloud 프로젝트를
연결해 만들고, **사용자 및 권한**에서 그 서비스 계정 이메일에 앱 권한(`앱 정보 보기` + `테스트 트랙에 출시`,
필요하면 `프로덕션에 출시`)을 부여해야 한다. **키 파일은 저장소에 두지 않는다.**

### 키가 동작하는지 미리 확인하는 방법

edit을 만들고 즉시 폐기하면 스토어를 바꾸지 않고 접근 권한만 확인할 수 있다
(`google-auth-library`는 이 레포 `node_modules`에 있으므로 **레포 안에서** 실행해야 해석된다):

```js
import { GoogleAuth } from 'google-auth-library';
const auth = new GoogleAuth({ keyFile: process.argv[2], scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
const { token } = await (await auth.getClient()).getAccessToken();
const res = await fetch('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.doublejbs.useless/edits', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' });
// 200이면 접근 가능 → 받은 id를 DELETE로 폐기한다
```

## 에이전트가 하지 않는 것

- **서비스 계정·API 키 생성.** 계정에 영구 자원이 남고 권한을 부여하는 일이라 사용자가 한다.
- **키 파일 내용을 열거나 출력하는 것.** 경로만 EAS에 넘긴다.
- **프로덕션 승격·단계적 출시 비율 조정·심사 제출.** 트랙에 올리는 것까지만 하고 나머지는
  사용자가 Play Console에서 한다.

## 알려진 정책 함정

- **targetSdkVersion**: Play는 최신 Android 출시로부터 1년 내 API 레벨을 요구한다. 현재 36
  (`app.json`의 `expo-build-properties`). 미달이면 업데이트가 막힌다.
- **사진·동영상 권한**: `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`는 지속적 접근이 핵심 목적인 앱만 쓸 수
  있다. 이 앱은 시스템 사진 선택 도구를 쓰므로 선언하지 않는다 —
  `expo-media-library` 플러그인의 `granularPermissions: []`, `expo-image-picker`의
  `microphonePermission: false`. 근거와 회귀 방지 기준은 [GearDetail.md](../../../specs/GearDetail.md) GD-13.
- ★ **권한 위반은 "모든 버전 코드"가 대상이다 — 프로덕션만 고치면 해소되지 않는다.**
  2026-08-21 실제로 겪었다: 프로덕션을 권한 제거 빌드(47)로 올렸는데 위반이 유지됐다.
  방치된 테스트 트랙 5개(beta 22 / alpha 2 / internal 18 / test 8 / 테스트 8)가 옛 권한을 들고 있었다.
  **정책 관련 릴리스에서는 트랙을 전수 조회하고 전부 같은 버전으로 맞춘다.**

```bash
# 트랙별 활성 버전 조회 (읽기 전용 — edit 생성 후 즉시 폐기). 레포 안에서 실행할 것.
# GET {base}/edits/{editId}/tracks → tracks[].releases[].versionCodes
```

  옛 버전을 걷는 방법은 둘이다: **① 새 버전을 각 트랙에 승격**(권장 — 정석이고 트랙이 최신이 된다),
  ② 트랙 릴리스를 비우기. 승격은 `PUT {base}/edits/{editId}/tracks/{track}`에
  `{ track, releases: [{ versionCodes: ['<코드>'], status: 'completed' }] }`를 넣는다.
  트랙 이름에 한글이 있으면 URL 인코딩한다.

- **API 커밋은 자동 심사 제출을 못 한다.** `:commit`을 그냥 부르면 400
  `Changes cannot be sent for review automatically`가 난다. `?changesNotSentForReview=true`로
  커밋해야 하고, 그러면 **심사 제출은 사용자가 Play Console → 게시 개요에서** 해야 한다.
  (`eas submit`은 자체 경로로 심사까지 보내므로 이 제약을 받지 않는다 — 트랙 조작만 이 제약이 있다.)

## 참고

- iOS는 `ios-release` 스킬. OTA(hot-updater)는 완전히 별개다 — `CLAUDE.md`의 "버전 관리 & OTA 배포".
