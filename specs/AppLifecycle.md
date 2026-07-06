# 앱 라이프사이클 (초기화 · OTA · 전역 알림 · 탭 구조)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `APP` |
| 주요 코드 | `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `model/app/App.ts`, `model/alert/`, `model/toast/`, `model/storage/LocalStorageManager.ts`, `components/Layout.tsx`, `hot-updater.config.ts` |
| 관련 스펙 | [DataModel.md](DataModel.md), [Auth.md](Auth.md) |

## 1. 개요

앱 부팅부터 첫 화면까지의 시퀀스, OTA 업데이트, 전역 Alert/Toast, 탭 네비게이션, 공통 UI 규칙을 정의한다.

## 2. 화면 및 진입

```
app/_layout.tsx (RootLayout, 네이티브는 HotUpdater.wrap)
  → 폰트 로드 + app.initialize() 완료까지 SplashLoadingView
  → Stack: (tabs) / custom / search / not-login-search(모달) / 기타 라우트
app/(tabs)/_layout.tsx → 탭 4개: 창고(index) · 탐색(search) · 배낭(bag) · 정보(info)
```

## 3. 요구사항

### APP-1 초기화 시퀀스

**수용 기준**

1. 폰트 로드 (`useFonts`): Pretendard 4종(Regular/Medium/SemiBold/Bold) + SpaceMono.
2. `app.initialize()` 1회 호출: `firebase.initialize()` → 스토어 생성(GearStore, GearImageStore, BagStore, SearchStore, ReplyStore) → 매니저 생성(AlertManager, ToastManager, LogInAlertManager) → `isInitialized = true`.
3. `firebase.initialize()`: Firebase 앱/Firestore/Storage 초기화 → (네이티브) GoogleSignin 설정 → 플랫폼별 Auth 초기화 → `authStateReady()` 대기 → 로그인/약관 상태 확인 → `onAuthStateChanged` 리스너 등록.
4. 폰트 미로드 또는 미초기화 동안 `SplashLoadingView`(검은 배경 #151515 + 앱 아이콘)를 렌더한다.
5. 초기화 후 로그인 + 약관 미동의면 `/terms-agreement`로 리다이렉트한다([Auth.md](Auth.md) AU-3).

### APP-2 OTA 업데이트 (Hot Updater)

**수용 기준**

- **웹은 HotUpdater를 적용하지 않는다.** 네이티브만 `HotUpdater.wrap()`으로 감싼다.
- 업데이트 체크: 앱 시작 시 자동. 전략 `updateStrategy: 'appVersion'` — **EAS 빌드 appVersion에 매칭**(스토어 마케팅 버전 아님).
- 업데이트 중 fallback UI: 검은 배경 + 아이콘 + `업데이트 확인 중...`/`업데이트 중...` + 진행률.
- 배포 절차·버전 체계·주의사항은 **CLAUDE.md의 "버전 관리 & OTA 배포" 섹션이 캐논컬 문서**다 (OTA 백엔드는 별도 Firebase 프로젝트 `useless-ota`).

### APP-3 전역 Alert

**수용 기준**

- `AlertManager.show({ message, confirmText, onConfirm })` — 취소/확인 2버튼 모달, 동시에 1개만 표시.
- 확인 버튼 핸들러는 async를 지원하고, 완료 후 자동으로 닫힌다.
- `AlertView`는 `components/Layout.tsx`에서 전역 렌더된다.

### APP-4 전역 Toast

**수용 기준**

- `ToastManager.show / showLong / showSimple` — 메시지 + 옵션 버튼.
- Android: `ToastAndroid`(네이티브 토스트). iOS/Web: 커스텀 `ToastView`(하단 고정, 3초 자동 닫힘, Layout에서 bottom 100).

### APP-5 탭 네비게이션

**수용 기준**

- 탭 4개: `창고`(house) / `탐색`(magnifyingglass) / `배낭`(figure.hiking) / `정보`(person). 활성 색상 검정.
- iOS: `HapticTab`(햅틱) + blur 투명 탭바(absolute), Android: `NoAnimationTab`, Web: 높이 65 고정 탭바.

### APP-6 공통 UI 규칙

**수용 기준**

- 모든 텍스트는 `PretendardText` 사용(weight: regular/medium/semibold/bold/extraBold, 기본색 #000000).
- 전역 오버레이(로그인 모달, Alert, Toast)는 `Layout.tsx`가 모든 화면에 깔아준다.
- 로컬 저장(`LocalStorageManager`, AsyncStorage 기반)은 JSON 직렬화 래퍼이며 현재 키는 `selectedOrderType_{key}`(정렬 선택)뿐이다.

### APP-7 스토어 강제 업데이트 게이트 `[제안]`

원격 설정으로 지정한 **최소 지원 버전** 미만의 앱에 대해, 닫을 수 없는 전체 화면 안내를 띄워 스토어 업데이트로 유도한다. (예: 알림 등 네이티브 변경이 든 새 버전으로 유저를 이동시킬 때. OTA로는 네이티브를 못 바꾸므로 스토어 업데이트가 필요하다.)

**수용 기준**

- 앱 시작 시(초기화 시퀀스, APP-1) 원격 설정 `config/app`([DataModel.md](DataModel.md) DM-13)에서 플랫폼별 최소 버전(`iosMinVersion` / `androidMinVersion`, semver 문자열)을 1회 조회한다. 실시간 구독은 하지 않는다.
- 현재 버전은 **`HotUpdater.getAppVersion()`(네이티브 바이너리 버전, `APP_VERSION` 상수)**으로 읽는다. `Constants.expoConfig.version`은 OTA 번들에 박힌 버전이라 **쓰지 않는다** — 최신 번들을 구버전 바이너리에 OTA로 내리면 실제 바이너리 버전과 달라져 판정이 깨진다. `getAppVersion()`은 Hot Updater가 있는 모든 바이너리(2025-09 이후)에서 실제 설치 바이너리 버전을 반환하므로 OTA로 배포돼도 정확하다.
- 이 값이 해당 플랫폼 최소 버전보다 **낮으면** 블로킹 게이트를 표시한다.
- 게이트 UI: 검은 배경 전체 화면 오버레이. 문구 `업데이트가 필요해요` / `최신 버전에서 새 기능을 사용할 수 있어요.` + 단일 버튼 `스토어에서 업데이트`. **닫기·취소 없음**, Android 하드웨어 뒤로가기 무효화.
- 버튼 탭 → 스토어로 이동. iOS `https://apps.apple.com/app/id6751174681`, Android `market://details?id=com.doublejbs.useless`(실패 시 `https://play.google.com/store/apps/details?id=com.doublejbs.useless`). 이동 후에도 게이트는 유지된다(업데이트 후 재실행해야 해제).
- **Fail-open**: 원격 설정 조회 실패·문서/필드 없음·버전 형식 파싱 불가 → 게이트를 표시하지 않고 조용히 통과한다. 어떤 경우에도 정상 유저를 막지 않는다.
- 게이트는 로그인·약관 상태와 무관하게 스플래시 이후 최상위에서 렌더된다(초기화·라우팅보다 우선).
- 웹은 no-op(스토어 개념 없음).
- 운영 주의: 최소 버전은 **해당 버전이 스토어에 실제 공개된 뒤에만** 올린다(안 그러면 최신 유저도 막힘). semver 비교는 `major.minor.patch` 숫자 비교.

> **전달 경로 (pre-1.1.6 유저까지 커버)**: 대상은 1.1.6 이전 바이너리(레거시 iOS 1.0.6 / Android 1.0.5 포함) 유저다. 이 바이너리들은 2026-06 빌드로 현재와 동일 런타임(Expo 54 / RN 0.81 / hot-updater 0.32)이고 2025-09부터 같은 OTA 백엔드를 폴링하므로 OTA 도달이 가능하다. 게이트 번들을 `production` 채널로 **각 라이브 appVersion에 개별 타깃**해 배포한다(`-t 1.0.6`, `-t 1.0.5`, `-t 1.1.6`, 그리고 신규 `-t 1.1.7`). 같은 번들이어도 각 바이너리가 `getAppVersion()`으로 자기 실제 버전을 보고하므로 게이트가 알아서 판정한다.
>
> **구버전 안전성**: 현재 번들은 1.1.7에서 추가된 `expo-notifications`·`@react-native-firebase/messaging` 네이티브를 호출한다. pre-1.1.7 바이너리엔 이 모듈이 없으므로, `NotificationManager`의 동적 `require()`를 try/catch로 감싸 부재 시 `null` 반환(확정 no-op)하도록 **하드닝**한 뒤 배포한다. 배포 전 실제 pre-1.1.6 바이너리(가용 시)에서 크래시 없음·게이트 표시를 검증한다. appVersion OTA 전략은 네이티브 호환을 검증하지 않으므로(APP-2 주의) 이 검증은 필수다.
>
> **운영 타이밍**: 최소 버전은 스토어에 실제 공개된 버전 이하로만 올린다. 예) iOS 스토어에 1.1.6이 이미 공개돼 있으므로 `iosMinVersion`을 1.1.6으로 두면 1.0.6 유저를 지금 바로 1.1.6으로 밀어올릴 수 있다(1.1.7 스토어 공개를 기다릴 필요 없음).

## 4. 데이터

- Firebase 초기화 구성: [DataModel.md](DataModel.md) 1장. 로컬 스토리지 키는 APP-6.

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| HotUpdater | 적용 | 적용 | 미적용 |
| Auth persistence | AsyncStorage | AsyncStorage | 브라우저 기본 |
| Toast | 커스텀 | `ToastAndroid` | 커스텀 |
| 탭바 | blur + absolute + 햅틱 | 기본 | 높이 65 |

## 6. 엣지 케이스

- 초기화 실패/지연: 스플래시가 계속 표시된다(타임아웃 없음).
- 존재하지 않는 라우트: `app/+not-found.tsx`.

## 7. 수동 검증 체크리스트

- [ ] 콜드 스타트: 스플래시 → 창고 탭 진입
- [ ] OTA 배포 후 앱 재시작 → fallback UI → 새 번들 적용 (CLAUDE.md 배포 절차 준수)
- [ ] 웹 빌드에서 OTA 코드가 동작하지 않음(에러 없음)
- [ ] Alert 확인 버튼의 비동기 작업 완료 후 닫힘
- [ ] Android 토스트가 네이티브 스타일로 노출

## 8. 미해결 질문

- 초기화 실패 시 무한 스플래시 — 재시도/에러 안내 정책 필요.
- `Constants.expoConfig.version`(정보 탭 노출)은 cosmetic이라 실제 EAS appVersion과 다를 수 있음 — 사용자 노출 버전의 기준 결정 필요.
- `PretendardText`의 `extraBold` weight는 `Pretendard-ExtraBold` 폰트를 참조하지만 해당 폰트는 로드되지 않는다(현재 사용처 없어 실해는 없음) — 로드 추가 또는 옵션 제거.
