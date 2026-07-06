# 작업 핸드오프 (2026-07-06)

다른 컴퓨터/세션에서 이어서 작업하기 위한 현재 상태 스냅샷. 완료되면 이 문서는 삭제한다.

## 1. 릴리스 1.1.7 상태

알림 기능(NT-1~6)을 담은 **1.1.7** 릴리스 진행 중. 관련 스펙: [specs/Notification.md](specs/Notification.md).

| 플랫폼 | 상태 | 비고 |
| --- | --- | --- |
| Android | ✅ EAS 빌드 성공(versionCode **35**), Play Console **스토어 제출 완료** | |
| iOS | ⏳ 빌드 실패 — 프로비저닝 프로파일에 Push capability 없음 | Apple 서버 점검(maintenance)으로 프로파일 재발급 API가 막힘. 점검 풀리면 재시도 |

### iOS 재개 방법 (Apple 점검 풀린 뒤)

워크트리(또는 1.1.7 코드가 있는 디렉토리)에서:

```bash
npx eas-cli build -p ios --profile production
```

- Apple ID 로그인 프롬프트 → 인증(2FA).
- `Would you like to reuse the original profile?` → **`no`** (새로 발급받아야 aps-environment가 들어감).
- 성공하면 이후 non-interactive로 빌드 이어받기 가능.
- 참고: EAS `--non-interactive`는 **Apple capability 동기화를 건너뛴다** → 최초 1회는 반드시 인증 실행 필요.

### 1.1.7 빌드가 3번 실패했던 원인 (모두 수정·머지 완료)

1. `package-lock.json` 불일치 → EAS `npm ci` EUSAGE (PR #22). 알림 네이티브 의존성 추가 후 lock 미갱신. → `npm install --package-lock-only`.
2. Android 매니페스트 병합 충돌 — expo-notifications와 `@react-native-firebase/messaging`이 `com.google.firebase.messaging.default_notification_color`를 다른 값으로 선언 (PR #23). → `plugins/WithFirebaseMessagingNotificationColor.js` (`tools:replace`).
3. iOS Push capability (위 iOS 항목).

### 1.1.7 남은 일

- [ ] Apple 점검 후 iOS 빌드 성공
- [ ] 실기기 알림 검증: 로컬 리마인더(배낭 D-1/사용기록) + Firebase 콘솔 토픽 `all` 테스트 푸시(iOS는 APNs 키 등록 완료 상태)
- [ ] develop → main 릴리스 머지 (사용자 결정) + 스토어 심사/출시

## 2. 진행 중 기능: 스토어 강제 업데이트 게이트 (미구현, 스펙 확정 대기)

목표: **1.1.6 이전 바이너리(레거시 iOS 1.0.6 / Android 1.0.5 포함) 유저에게 "스토어에서 업데이트" 블로킹 알럿**을 띄워 최신 버전으로 유도.

스펙: [specs/AppLifecycle.md](specs/AppLifecycle.md) **APP-7** (`[제안]`), 데이터: [specs/DataModel.md](specs/DataModel.md) **DM-13 `config/app`** (`[제안]`).

### 확정된 설계 핵심

- **버전 소스는 `HotUpdater.getAppVersion()`** (네이티브 바이너리 실제 버전). `Constants.expoConfig.version`은 **쓰지 않는다** — OTA 번들에 박힌 버전이라, 최신 번들을 구버전에 OTA로 내리면 판정이 깨짐. `getAppVersion()`은 Hot Updater가 있는 모든 바이너리(2025-09 이후)에 존재.
- 원격 설정 `config/app`의 `iosMinVersion`/`androidMinVersion`(semver)보다 낮으면 블로킹 게이트 표시. **Fail-open**(조회 실패·문서 없음·파싱 불가 → 미표시, 정상 유저 절대 안 막음).
- 게이트 UI: 검은 배경 전체 화면, 닫기 없음, `업데이트가 필요해요` / `최신 버전에서 새 기능을 사용할 수 있어요.` + 버튼 `스토어에서 업데이트`. Android 하드웨어 뒤로가기 무효화.
- 스토어 링크: **iOS App Store ID `6751174681`** → `https://apps.apple.com/app/id6751174681`, Android `market://details?id=com.doublejbs.useless` (실패 시 `https://play.google.com/store/apps/details?id=com.doublejbs.useless`).
- 웹 no-op.

### 왜 pre-1.1.6 OTA 도달이 가능한가 (조사 완료)

- 레거시 1.0.5/1.0.6은 2026-06 빌드로 **현재와 동일 런타임**(Expo 54 / RN 0.81.5 / React 19.1 / hot-updater 0.32). 런타임 비호환 벽 없음.
- Hot Updater가 **2025-09-21(v1.0.2)부터 같은 백엔드**(`hot-updater-7llz3bz5aq-du.a.run.app`)를 폴링 → OTA 도달 가능.
- 레거시 대비 새 네이티브 모듈은 `expo-notifications`·`@react-native-firebase/messaging` 둘뿐 (`@react-native-firebase/analytics`는 2025-10부터 있어 레거시에도 존재).

### 구현 순서 (사용자 확인 후 진행)

1. **하드닝**: `model/notification/NotificationManager.ts`의 `getNotifications()`/`getMessaging()` 동적 `require()`를 try/catch로 감싸 모듈 부재 시 `null` 반환(구버전에서 확정 no-op). appVersion OTA는 네이티브 호환 검증 안 하므로 필수.
2. **게이트 구현**: 원격 설정 조회 + `getAppVersion()` semver 비교 + 블로킹 UI + 스토어 링크. 앱 시작 시 1회, 스플래시 이후 최상위 오버레이, 로그인 무관. 웹 no-op.
3. **검증**: `npm run lint` + `npx tsc --noEmit` + 실기기(가용 시 pre-1.1.6 바이너리에서 크래시 없음·게이트 표시).
4. **3단계 리뷰**: 스펙 컴플라이언스 / 코드 퀄리티 / UX·디자인.

### 배포 (구현·리뷰 후)

- **보안 규칙**: `config/app` 미인증 공개 읽기 허용 규칙 추가 필요 (`gear`/`gear-rank`와 동일 정책). **사용자 콘솔/규칙 배포 작업**.
- **OTA 배포는 반드시 메인 워크스페이스(원본 클론)에서** — `.env.hotupdater`·admin 자격증명이 gitignore라 워크트리엔 없음. 게이트 번들을 각 라이브 appVersion에 개별 타깃:
  `-t 1.0.6`(iOS 레거시) · `-t 1.0.5`(Android 레거시) · `-t 1.1.6` · `-t 1.1.7`, 모두 `-c production`.
  라이브 appVersion은 `npx eas-cli build:list`로 확인.
- **운영 타이밍**: `iosMinVersion`을 **1.1.6**으로 두면 iOS 스토어에 이미 공개된 1.1.6으로 1.0.6 유저를 지금 바로 밀어올릴 수 있음(1.1.7 스토어 공개를 기다릴 필요 없음).

## 3. 현재 브랜치/PR 상태

- 작업 베이스: `develop` (main 직접 수정 금지, 릴리스 시 develop→main 머지는 사용자 결정).
- 최근 머지 PR: #20(알림) · #21(1.1.7 범프) · #22(lockfile) · #23(매니페스트) · #24(알림 빌드 제약 스펙).
- 이 문서와 APP-7/DM-13 스펙은 별도 PR로 develop 머지 예정.

## 4. 참고 사실

- iOS App Store ID: `6751174681`, 번들 ID: `com.doublejbs.useless`, Apple Team: `NFV6WC2X83`.
- 앱 Firebase 프로젝트: `lessismore-7e070`. OTA 백엔드: 별도 `useless-ota`.
- 현재 스토어 공개 버전: iOS **1.1.6** (iTunes lookup 확인). Android는 1.1.7 심사 중.
