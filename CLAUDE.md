# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
# 개발
npm start                    # Expo 개발 서버 시작
npx expo start               # 대체 시작 명령어

# 플랫폼별 실행
npm run ios                  # iOS 시뮬레이터 실행 (expo run:ios)
npm run android              # Android 에뮬레이터 실행 (expo run:android)
npm run web                  # 웹 버전 시작

# 린트
npm run lint                 # ESLint 실행
npm run lint:fix             # ESLint 자동 수정
npm run lint:unused          # 사용하지 않는 import 찾기/수정

# 빌드 & 배포
npm run web:export           # 웹 빌드를 /dist로 내보내기
npm run deploy               # 웹 내보내기 + Firebase Hosting 배포
npm run hotupdate            # Hot Updater로 OTA 업데이트 배포
npm run hotupdate:preview    # 프리뷰 채널에 OTA 업데이트 배포
npm run expo:clean           # 네이티브 프로젝트 클린 리빌드 (expo prebuild --clean)
npm run web:preview          # 웹 빌드 후 로컬에서 미리보기 (serve dist)
```

> **테스트**: 현재 테스트 프레임워크가 설정되어 있지 않음 (package.json에 `test` 스크립트 없음). 새 테스트를 추가할 때 먼저 사용자에게 어떤 러너를 사용할지 확인할 것.

## 스펙 주도 개발

이 저장소는 **스펙 주도(spec-driven)로 개발한다.** 동작 명세의 단일 소스는 `specs/` 디렉토리다.

- 기능 추가·변경·버그 수정은 **코드보다 `specs/`의 해당 도메인 스펙을 먼저 갱신**하고, 스펙 diff를 사용자에게 확인받은 뒤 구현한다.
- 절차(스펙 → 검증 체크리스트 → 구현 → 검증 → 리뷰), 요구사항 ID 규칙, 문서 구조는 [specs/README.md](specs/README.md) 참고.
- 스펙과 코드가 다르면: 스펙이 의도면 코드를 고치고, 코드가 맞으면 스펙을 갱신한다. 모호하면 사용자에게 확인한다.
- Firestore/Storage/Algolia 필드·경로 계약은 [specs/DataModel.md](specs/DataModel.md)에만 정의한다.

## 아키텍처

### 기술 스택

- **Expo 54** + React Native 0.81 + React 19.1 (iOS / Android / Web 모두 지원)
- **레거시 아키텍처 유지** (`newArchEnabled: false`) — 이 때문에 `react-native-reanimated`는 3.x로 고정 (4.x는 New Arch 전용, `expo.install.exclude`에 등록됨). SDK 55+(RN 0.82+)는 New Arch가 강제라 업그레이드 전 마이그레이션 필요
- **MobX** 상태 관리 (`makeAutoObservable` 사용)
- **Expo Router** 파일 기반 라우팅
- **Firebase** (Auth, Firestore, Storage) + **Algolia** 검색
- **Hot Updater** (네이티브 OTA 업데이트, 웹에서는 비활성)
- **TypeScript** strict 모드 — `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `experimentalDecorators` 모두 켜져 있음
- 경로 별칭: `@/*` → 저장소 루트 (예: `import app from '@/model/app/App'`)

### 디렉토리 구조

- `/app` - Expo Router 페이지 (파일 기반 라우팅)
  - `(tabs)/` - 하단 탭 네비게이션 (창고/검색/배낭/정보)
  - `gear-detail/[id]`, `bag/[id]` 같은 동적 세그먼트 라우트
  - `terms-agreement`, `not-login-search`, `share-image`, `useless` 등 모달/특수 화면
- `/components` - 기능별 폴더로 정리된 UI 컴포넌트 (`warehouse/`, `bag/`, `gear/`, `search/`, `alert/`, `toast/` 등)
- `/model` - MobX 스토어 및 비즈니스 로직
  - `app/App.ts` - 루트 싱글톤, 앱 시작 시 `initialize()` 1회 호출
  - `store/` - **데이터 CRUD 레이어** (GearStore, BagStore, GearImageStore, ReplyStore) — Firebase에 직접 접근
  - `firebase/Firebase.ts` - Auth/Firestore/Storage 초기화 + 로그인/탈퇴/약관 동의
  - `search/SearchStore.ts` - Algolia 검색 연동
  - `<도메인>/` - 도메인 모델 (`warehouse/`, `bag-detail/`, `bag-edit/`, `gear/`, `gear-image/`, `order/`, `filter/`, `login/`, `webview/` 등). 각 도메인은 보통 모델 클래스 + `Dispatcher` 클래스 쌍으로 구성됨
  - `alert/`, `toast/` - 전역 알림/토스트 매니저
- `/hooks` - 커스텀 React 훅
- `/constants` - 앱 상수
- `/scripts` - 유지보수용 스크립트 (`reset-project.js` 등)

### 상태 관리 패턴

컴포넌트는 MobX observer 패턴 사용:

```typescript
import { observer } from 'mobx-react-lite';
import { app } from '@/model/app/App';

const MyComponent = observer(() => {
  const gearStore = app.getGearStore();
  return <View>{/* UI */}</View>;
});
```

스토어는 `makeAutoObservable()`로 자동 observable 추적.

### 화면 구조 패턴

화면은 상태 초기화를 위한 3단 래퍼 패턴을 따름:

1. **라우트 파일** (`app/(tabs)/index.tsx`) — 래퍼만 렌더
2. **Wrapper 컴포넌트** (`components/<domain>/<Domain>Wrapper.tsx`) — `useState(() => Domain.from(Dispatcher.new(), …))` 로 도메인 객체를 1회 생성하고, 초기화 상태를 가드
3. **Screen 컴포넌트** — 실제 UI를 렌더, 도메인 객체를 props로 받음

도메인 객체는 정적 팩토리 (`Foo.from(...)`, `Bar.new()`) 로 생성하며, 의존성(매니저/Firebase/Dispatcher)을 생성자에서 주입받음. 컴포넌트는 `app` 싱글톤에서 의존성을 가져와 팩토리에 넘김.

### 앱 초기화 & 인증 흐름

- `app/_layout.tsx`의 `useEffect`가 `app.initialize()`를 1회 호출 → Firebase 초기화 + 모든 스토어 인스턴스화
- 초기화 완료 전에는 `SplashLoadingView` 렌더 (`!loaded || !isInitialized`)
- 로그인 후 약관 미동의 사용자는 자동으로 `/terms-agreement`로 리다이렉트
- 로그인 제공자: Google / Apple / Email (Firebase Auth) — `firebase.getLoginProvider()` 로 확인. 회원 탈퇴 시 제공자별 재인증 분기됨

### 플랫폼 분기

`Platform.OS` 로 갈리는 부분이 여러 곳에 있음 — 변경 시 세 환경(iOS/Android/Web) 모두 고려할 것:

- `app/_layout.tsx` — 웹은 HotUpdater 래핑을 건너뜀
- `model/firebase/Firebase.ts` — 네이티브는 `getReactNativePersistence` + `GoogleSignin` 라이브러리, 웹은 `getAuth` + `signInWithPopup` (동적 import)
- Apple 로그인은 iOS와 웹만 지원

### Firebase 데이터 구조

```
/users/{userId}/gears/    # 사용자의 장비 컬렉션
/users/{userId}/bags      # 사용자 문서에 저장
/gear/                    # 전체 장비 카탈로그
/bag/                     # 공유된 배낭
/gear-rank/               # 인기도 추적
```

**두 개의 Firebase 프로젝트가 분리되어 있음:**

- 앱 데이터(Auth / Firestore / Storage): **`lessismore-7e070`** (`model/firebase/Firebase.ts`의 config)
- Hot Updater OTA 백엔드: **`useless-ota`** (`.env.hotupdater`의 `HOT_UPDATER_FIREBASE_PROJECT_ID`, admin 자격증명도 이 프로젝트용). **이 admin 키로는 앱 Firestore(`lessismore-7e070`)에 못 씀.**

**장비 이름 필드 — `name` / `nameKorean`:**

- 표시에는 항상 `Gear.getDisplayName()` (= `nameKorean || name`)을 쓴다. `getName()`은 편집 폼 프리필·중복키·정렬(`orderBy('name')`)용 **캐논컬 값**이라 표시에 쓰지 말 것.
- `/gear` 카탈로그는 정리되어 대부분 **`nameKorean`=한글(표시값), `name`=영문 또는 빈 값**. 단, `/users/{userId}/gears`(사용자 추가분)는 마이그레이션하지 않아 옛 형태(`name`=한글)일 수 있음 — `getDisplayName()` fallback으로 어느 쪽이든 정상 표시됨.
- Firestore 데이터 일괄 변경 스크립트는 admin 키가 없어 **클라이언트 SDK + public config**로 작성(`scripts/migrate-name-korean.mjs`, `scripts/swap-namekorean.mjs` 참고). `/gear`·`/gear-rank`는 보안 규칙상 미인증 쓰기가 허용됨. 변경 전 반드시 백업 JSON을 먼저 저장한다.

**Algolia 검색** — 인덱스 `useless-gear-search`(app id `BWS6CWRXRM`). `searchableAttributes`에 `nameKorean`이 포함되어 있어 `name`이 비어도 한글 검색이 동작. Firestore `/gear` 쓰기는 익스텐션으로 Algolia에 자동 동기화됨.

### 전역 서비스

`app` 싱글톤을 통해 접근:

- `app.getGearStore()` - 장비 CRUD 작업
- `app.getBagStore()` - 배낭 관리
- `app.getSearchStore()` - Algolia 검색
- `app.getAlertManager()` - 알림 표시
- `app.getToastManager()` - 토스트 표시
- `app.getFirebase()` - Firebase 인스턴스

## 주요 컨벤션

- **Git 브랜치 정책 (2026-06-11부터)**: 작업은 `develop` 베이스 — 작업 브랜치를 `develop`에서 따고 PR 베이스도 `develop`으로 보낸다. `main`은 직접 건드리지 않는다 (커밋·머지 금지, 릴리스 머지는 사용자가 결정)
- 한국어 UI (커밋 메시지도 한국어 사용)
- 텍스트는 `PretendardText` 컴포넌트 사용 (커스텀 한글 폰트 — `assets/fonts/Pretendard-*.ttf`). `fontWeight`/`fontFamily`를 직접 쓰지 말고 `weight` prop(`regular`/`medium`/`semibold`/`bold`/`extraBold`)을 쓴다. raw `<Text>` 금지.
- **디자인 토큰은 `constants/DesignTokens.ts`가 단일 소스** — 색(`Color`), 모서리(`Radius`), 여백(`Spacing`)을 하드코딩하지 말고 토큰을 참조한다. 탐색(피드)·배낭 패킹모드 화면에서 추출·정규화한 값이며 앱 전 화면이 이 톤을 따른다. 대표값: 텍스트 `textPrimary`#000/`textSecondary`#888, 칩 `chipInactiveBg`#EBEBEB/`chipActiveBg`#000, 인풋 `inputBg`#F5F5F5, 썸네일 `thumbBg`#F1F1F1, 구분선 `borderLight`#F0F0F0; radius 카드/인풋 8·칩 22·필 32·모달 16·리스트썸네일 4. 데이터 시각화 색·브랜드 액센트 등 의미색은 예외.
- 이미지는 `FirebaseImageStorage`를 통해 Firebase Storage에 업로드
- Hot Updater가 네이티브 플랫폼에서 OTA 업데이트 처리 (`hot-updater.config.ts` 참고)
- 린트 규칙은 `eslint-config-expo` 기반 + `unused-imports` 플러그인 — `_` 접두 변수는 무시됨

## 버전 관리 & OTA 배포 (중요)

**단일 버전 체계 (1.1.5부터):** `app.json`의 `version`이 유일한 버전 소스다. 이 값이 양 플랫폼 바이너리의 appVersion(iOS `CFBundleShortVersionString` / Android `versionName`)이 되고, 스토어 제출 라벨도 같은 값으로 넣고, OTA `-t`도 같은 값을 쓴다. **릴리스 시 app.json `version`을 먼저 올리고 EAS 빌드한다.**

- `eas.json`의 `appVersionSource: "remote"` + `autoIncrement`가 원격 관리하는 것은 **buildNumber(iOS)/versionCode(Android)뿐**이다. appVersion은 app.json에서 온다 (과거 문서의 "app.json version은 cosmetic"은 잘못된 서술이었음).
- **OTA 타깃**: `updateStrategy: "appVersion"`이므로 앱이 런타임에 보고하는 appVersion에 매칭. 빌드별 appVersion은 `npx eas-cli build:list`로 확인.
- **레거시 주의 (1.1.5 이전 라이브 바이너리)**: 통일 전 빌드는 스토어 라벨과 바이너리 버전이 다르다 — iOS 스토어 1.1.4 = 바이너리 **1.0.6**, Android 스토어/바이너리 **1.0.5**. 이 바이너리들에 OTA를 보낼 일이 있으면 그 옛 값을 `-t`로 줘야 한다 (스토어 라벨 1.1.4 아님).

**배포 시 규칙:**

- 반드시 **저장소 루트(메인 워크스페이스)** 에서 실행 — `.env.hotupdater`와 admin 자격증명이 gitignore라 워크트리엔 없다.
- `-t`를 **명시**한다. `-i` 인터랙티브 자동감지는 로컬 네이티브(`ios/` `MARKETING_VERSION`/Info.plist, `android/app/build.gradle`)를 읽는데 이 값들이 stale이라 **틀린 타깃**을 잡는다.
- OTA 전 라이브 빌드의 커밋 시점 → HEAD 사이에 네이티브/의존성 변경(`git log <base>..HEAD -- package.json ios android`)이 없는지 확인한다. appVersion 전략은 네이티브 호환을 검증하지 않으므로 변경이 있으면 크래시 위험.
- 배포 명령 예 (1.1.5 이후 통일 체계): `npx hot-updater deploy -p ios -t 1.1.5 -c production` / `-p android -t 1.1.5 -c production`. 레거시 바이너리 대상이면 `-t 1.0.6`(iOS) / `-t 1.0.5`(Android).
- 관리 콘솔: `npx hot-updater console` (http://localhost:1422)

**실제 출시 흐름**: EAS로 iOS/Android 빌드 → 스토어에 수동 제출/출시. 스토어 공개 버전 확인은 iTunes Lookup(`https://itunes.apple.com/lookup?bundleId=com.doublejbs.useless`)·Play Store 페이지로 가능(둘 다 공개 출시본만 노출).

**EAS 빌드 실패 디버깅:**

- 먼저 `npx eas-cli build:list --platform <ios|android> --limit 1 --json --non-interactive`의 `error.errorCode`로 원인을 구분한다 — `SERVER_ERROR`("We've lost connection to the worker")는 EAS 인프라 장애라 **그냥 재시도**하면 되고, `EAS_BUILD_UNKNOWN_GRADLE_ERROR` 등 프로젝트 에러는 같은 자리에서 재발하므로 로그를 확인해 고친 뒤 재빌드한다.
- 같은 응답의 `logFiles` URL(서명 만료 900초)은 **brotli 압축 JSONL**이다: `curl -s "$URL" -o log.br && brotli -d -f log.br -o log.jsonl`로 풀고, 각 줄 JSON의 `phase`/`msg` 필드를 본다. Gradle 에러는 `RUN_GRADLEW` phase에서 `FAILURE`·`What went wrong`을 찾으면 된다.
- 네이티브 매니페스트/프로젝트 설정 수정은 `android/`·`ios/`가 gitignore라(managed 워크플로우, EAS 워커가 prebuild로 재생성) 직접 고쳐도 빌드에 반영되지 않는다 — **config plugin**으로 고치고 `npx expo prebuild -p android --no-install` 산출물로 검증한다 (`plugins/WithMlKitVisionDependencies.js` 참고).
