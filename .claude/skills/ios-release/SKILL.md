---
name: ios-release
description: iOS 프로덕션 빌드를 맥에서 직접 만들고(EAS 로컬 빌드) App Store Connect에 올린다. "ios 빌드해서 올려줘", "1.1.x 배포해줘" 같은 요청에 쓴다. Android나 OTA(hot-updater) 배포에는 쓰지 않는다.
---

# iOS 프로덕션 릴리스

로컬에서 `.ipa`를 만들고 App Store Connect(TestFlight)에 업로드한다. 빌드는 이 맥의
Xcode로 돌고, 서명 인증서만 EAS 서버에서 받아온다.

## 실행 전 확인

1. **저장소 루트에서 실행한다** — 워크트리가 아니라 `/Users/user/Documents/GitHub/lessismore-app`.
   `.env`·인증 정보가 루트에만 있다.
2. **버전을 먼저 올린다** — `app.json`의 `version`이 유일한 버전 소스다. 이 값이 양 플랫폼
   바이너리 버전이자 스토어 라벨이자 OTA 타깃이 된다. 빌드번호(`buildNumber`)만 EAS가
   원격에서 자동 증가시킨다(`eas.json`의 `autoIncrement`).
3. **어느 브랜치인지 말한다** — 릴리스 빌드는 현재 체크아웃된 브랜치에서 나온다.
   `develop`에 머지되지 않은 브랜치라면 사용자에게 그 사실을 먼저 알리고 확인받는다.
4. **인증서 만료일을 본다** — 빌드 로그 앞부분에 배포 인증서·프로비저닝 프로파일 만료일이
   찍힌다. 한 달 안이면 사용자에게 알린다.

## 1. 빌드

```bash
cd /Users/user/Documents/GitHub/lessismore-app
npx eas-cli build --platform ios --profile production --local --non-interactive
```

- 15~40분 걸린다. **백그라운드로 돌리고 완료 알림을 기다린다.** 로그를 짧은 주기로
  폴링하지 않는다.
- 로그를 모니터링한다면 필터에 `Error`를 넣지 말 것 — 소스 파일명(`OIDError.m` 등)에
  걸려 알림이 쏟아진다. `Build successful|error:|FAILURE|fastlane` 정도가 적당하다.
- 중간에 `expo doctor`가 실패해도 빌드는 계속된다. 스키마·의존성 경고는 기존 프로젝트
  상태이므로 릴리스를 막지 않는다.
- 성공하면 저장소 루트에 `build-<타임스탬프>.ipa`가 생긴다(약 54MB).

## 2. 업로드

```bash
.claude/skills/ios-release/submit.sh build-<타임스탬프>.ipa
```

성공하면 제출 URL과 TestFlight 링크가 출력된다. Apple 처리에 5~10분 더 걸리고 완료되면
메일이 온다.

### 이 스크립트가 필요한 이유

`eas submit`은 제출 인증 정보를 **`eas.json`에서만** 읽는다. `EXPO_ASC_API_KEY_PATH` 같은
환경변수는 이 CLI 버전(21.5)에서 무시된다(2026-08-04 확인). 그런데 키 식별자를 저장소에
커밋하고 싶지는 않으므로, 스크립트가 실행 시점에 `.env.submit`(gitignore 대상)의 값으로
`eas.json`을 임시 패치하고 끝나면 되돌린다.

`--non-interactive` 없이 실행하면 EAS가 프롬프트를 띄우는데, **에이전트 셸에는 stdin이 없어
답할 수 없다**. 파이프도 안 먹는다(CLI가 TTY 여부를 확인한다). 그래서 인증 정보를 미리
채워 두고 항상 `--non-interactive`로 돌린다.

## 최초 1회 준비 (새 머신)

`.env.submit`을 저장소 루트에 만든다. **gitignore 대상이라 커밋되지 않는다.**

```
ASC_API_KEY_PATH=$HOME/Library/Mobile Documents/com~apple~CloudDocs/claude/AuthKey_XXXXXXXXXX.p8
ASC_KEY_ID=XXXXXXXXXX
ASC_ISSUER_ID=<App Store Connect 발급자 ID>
```

- `.p8` 파일은 iCloud의 `claude/` 폴더에 있다. **이 파일은 저장소에 두지 않는다.**
- `ASC_KEY_ID`는 파일명의 `AuthKey_` 뒤 부분이다.
- `ASC_ISSUER_ID`는 App Store Connect → 사용자 및 액세스 → 통합 → App Store Connect API
  상단의 UUID다.
- EAS 서버에는 이 키가 저장되어 있지 않다(계정 조회 결과 0개). 즉 **로컬 키 파일이 유일한
  인증 수단**이므로 이 파일이 없으면 업로드할 수 없다.

## 에이전트가 하지 않는 것

- Apple ID 비밀번호·2FA 코드 입력. 프롬프트가 그 단계까지 가면 멈추고 사용자에게 넘긴다.
- `.p8` 파일 내용을 열거나 출력하는 것. 경로만 EAS에 넘긴다.
- App Store Connect에서 **새 API 키 생성**(계정에 영구 생성물이 남는다). 기존 키를 쓴다.
- 스토어 심사 제출·출시. 업로드까지만 하고 나머지는 사용자가 App Store Connect에서 한다.

## 참고

- 이 흐름은 iOS 전용이다. Android는 `--platform android`로 같은 구조지만 제출 인증이 다르다.
- OTA(hot-updater)는 완전히 별개다 — `CLAUDE.md`의 "버전 관리 & OTA 배포"를 볼 것.
- 로컬 빌드는 디스크를 몇 GB 쓴다. 여유가 없으면 Xcode DerivedData를 지우고 다시 시도한다.
