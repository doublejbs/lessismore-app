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
