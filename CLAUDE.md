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

> **로컬 iOS 실행 함정** (`npm run ios` 실패 시 순서대로 확인):
>
> 1. **의존성 먼저**: 새 클론/워크트리는 `node_modules`가 없거나 부분 설치라 `Failed to resolve plugin for module '@react-native-firebase/messaging'` 등이 난다 → `npm install` 먼저.
> 2. **CocoaPods 인코딩** (Ruby 3.4 환경): `pod install`이 `Encoding::CompatibilityError`("CocoaPods requires UTF-8")로 죽으면 로케일을 붙여 실행 → `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npm run ios`.
> 3. **stale `ios/` prebuild**: `ios/`는 gitignore(managed 워크플로우)라 새 클론엔 없고 `expo run:ios`가 자동 prebuild한다. 단, 옛 `ios/`가 남아 있으면 최신 네이티브 모듈이 빠져 런타임 크래시(예: `Cannot find native module 'ExpoPushTokenManager'`)가 날 수 있다 → `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo prebuild -p ios --clean` 후 재빌드. (참고: expo-notifications pod 이름은 `EXNotifications`)
> 4. 특정 시뮬레이터 지정: `npm run ios -- --device "iPhone 17 Pro"`. dev-client 딥링크: `exp+lessismore-app://expo-development-client/?url=http://localhost:8081`, 앱 스킴: `lessismoreapp://`.

## 스펙 주도 개발

이 저장소는 **스펙 주도(spec-driven)로 개발한다.** 동작 명세의 단일 소스는 `specs/` 디렉토리다.

- 기능 추가·변경·버그 수정은 **코드보다 `specs/`의 해당 도메인 스펙을 먼저 갱신**하고, 스펙 diff를 사용자에게 확인받은 뒤 구현한다.
- 절차(스펙 → 검증 체크리스트 → 구현 → 검증 → 리뷰), 요구사항 ID 규칙, 문서 구조는 [specs/README.md](specs/README.md) 참고.
- 스펙과 코드가 다르면: 스펙이 의도면 코드를 고치고, 코드가 맞으면 스펙을 갱신한다. 모호하면 사용자에게 확인한다.
- Firestore/Storage/Algolia 필드·경로 계약은 [specs/DataModel.md](specs/DataModel.md)에만 정의한다.

## 구현 워크플로우 & 서브에이전트

> 글로벌 컨벤션(`~/.claude/CLAUDE.md`)의 워크플로우 규칙을 이 프로젝트에 맞춰 정리한 것. 단순 질문·탐색·설명 요청에는 적용하지 않는다.

구현 작업(기능 추가·변경·버그 수정·리팩토링)은 다음 순서를 따른다:

1. **스펙 작성** — 코드보다 `specs/`의 해당 도메인 스펙을 먼저 갱신하고, diff를 사용자에게 확인받는다 (위 "스펙 주도 개발" 참고).
2. **테스트 작성** — 원칙적으로 구현 전 테스트를 먼저 작성한다. 단, 이 저장소는 테스트 프레임워크가 미설정이므로 러너가 필요하면 먼저 사용자에게 확인한다.
3. **구현** — 태스크마다 신규 서브에이전트를 디스패치한다 (아래 규칙 참고).
4. **검증** — `npm run lint` / `tsc`(strict) 통과를 확인한다. UI 변경은 실행 중 앱 스크린샷으로 HIG 기준 점검.
5. **코드 리뷰** — 서브에이전트로 리뷰한다 (아래 2단계).

### 서브에이전트 규칙

구현이 포함된 작업은 서브에이전트로 실행한다.

- 서브에이전트는 세션 컨텍스트를 상속하지 않으므로 **파일 경로·변경 내용·검증 명령을 프롬프트에 직접 포함**한다.
- 서브에이전트가 구현 + `lint`/타입체크 검증 + 완료 보고를 수행한다.
- 리뷰는 **태스크 완료 후 2단계**로 진행한다: ① 스펙 컴플라이언스(스펙 요구사항과 구현 일치) → ② 코드 퀄리티(글로벌 + 이 프로젝트 컨벤션). 이슈 발견 시 구현 서브에이전트가 수정 후 재리뷰하며, 두 단계 모두 통과해야 다음 태스크로 넘어간다.

### 모델 선택

| 역할 | 모델 |
| --- | --- |
| 단순 구현 (1~2 파일, 명확한 스펙) | haiku |
| 복잡한 구현 (다중 파일, 판단 필요) | opus |
| 리뷰 | opus |

## 아키텍처

### 기술 스택

- **Expo 57** + React Native 0.86 + React 19.2 (iOS / Android / Web 모두 지원)
- **신아키텍처(New Architecture)** — `app.json`의 `newArchEnabled: true`. `react-native-reanimated`는 **4.x**(현재 4.5)를 쓴다.
  - **[이력] 이전에는 레거시 아키텍처 + reanimated 3.x 고정이었다.** `expo.install.exclude`의 reanimated 제외 항목도 지금은 없다. 옛 서술을 근거로 "reanimated는 3.x여야 한다"고 판단하지 말 것.
  - 신아키텍처에서만 나는 문제가 있다. 예: 다른 Activity(사진 피커 등)에서 돌아올 때 안드로이드가 네이티브 뷰를 다시 만들면 **Reanimated 애니메이션 스타일이 생성 시점 초기값에 멈춘다** — 공유 값을 다시 써도 소용없고 뷰를 새로 붙여야 한다([BagShare.md](specs/BagShare.md) BS-9).
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
  - `terms-agreement`, `not-login-search`, `useless` 등 모달/특수 화면
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
- **디자인 토큰은 `constants/DesignTokens.ts`가 단일 소스** — 색(`Color`), 모서리(`Radius`), 여백(`Spacing`)을 하드코딩하지 말고 토큰을 참조한다. 탐색(피드)·배낭 패킹모드 화면에서 추출·정규화한 값이며 앱 전 화면이 이 톤을 따른다. 대표값: 텍스트 `textPrimary`#000/`textSecondary`#767676(WCAG AA)/`textTertiary`#555, 칩 `chipInactiveBg`#EBEBEB/`chipActiveBg`#000/`chipBorder`#E5E5E5, 인풋 `inputBg`#F5F5F5, 썸네일 `thumbBg`#F1F1F1, 구분선 `borderLight`#F0F0F0; radius 카드/인풋/칩 8·필 32·모달 16·리스트썸네일 4. 선택형 필터·카테고리 칩은 공용 `LiquidChip`(완전한 알약: 비선택 흰 유리 톤 채움+0.5px 보더+`inkSecondary`, 선택 잉크 채움+흰 글자 600; 고정 높이 금지로 Dynamic Type 대응; `hitSlop`으로 44pt 터치)으로 통일한다 — 구세대 `CategoryChipView`는 참조가 끊겨 걷었다(2026-08-11). 데이터 시각화 색·브랜드 액센트 등 의미색은 예외.
  - **정렬 완료 (2026-07)**: 앱 전 화면·모달을 토큰으로 전수 정렬함(리터럴이 값이 같아도 토큰 참조로 치환). 새 UI도 리터럴 대신 토큰·`PretendardText`(weight prop)를 쓴다. **예외(하드코딩 허용)**: 데이터 시각화/차트 색, 브랜드 액센트(예 `#7C3AED`·`#39FF14`), 시맨틱 상태색(성공 green·삭제/경고 red·달력 요일색), 스켈레톤 셰이딩, 공유 이미지 **내보내기 캔버스**(별도 Inter 폰트·팔레트 — 주변 앱 UI는 토큰 적용), `useless` 워드마크 굵기.
- **UX/UI 구현·리뷰는 Apple Human Interface Guidelines(HIG)를 기준으로 한다.** 새 화면/컴포넌트는 물론 기존 화면 개선도 HIG로 판단한다 — 터치 타깃 44×44pt, 아이콘 전용 컨트롤엔 `accessibilityLabel`(+ `accessibilityRole`), 명확한 위계(내비 타이틀=화면 대상), 충분한 대비, 콘텐츠를 가리지 않는 플로팅/오버레이, 화면당 명확한 주 액션 1개, 세이프에어리어 준수. UI 변경 리뷰는 **실행 중 앱 스크린샷** 근거로 HIG 기준 점검한다([specs/README.md](specs/README.md) UX/디자인 리뷰 기준 참고).
- **장비 이미지는 취급하지 않는다** — 장비 이미지 미제공 원칙([specs/DataModel.md](specs/DataModel.md) §1, 2026-07-28). 크롤링 제공·사용자 업로드·공유 갤러리 전부 제거됨(Storage 업로드 경로 없음)
- Hot Updater가 네이티브 플랫폼에서 OTA 업데이트 처리 (`hot-updater.config.ts` 참고)
- 린트 규칙은 `eslint-config-expo` 기반 + `unused-imports` 플러그인 — `_` 접두 변수는 무시됨

## 코드 스타일 & 네이밍 컨벤션

> 글로벌 컨벤션(`~/.claude/CLAUDE.md`) 중 이 프로젝트에 적용되는 규칙. 구현·리뷰 시 준수한다.

### 언어

- 코드 식별자(주석·변수명·함수명)를 제외한 모든 텍스트(문서·커밋 메시지)는 **한글**로 작성한다.

### 파일 네이밍

- 컴포넌트·모델·훅 등 주요 소스 파일은 **PascalCase**를 쓴다 (`GearStore.ts`, `PretendardText.tsx`).
- 역할이 불분명한 `index.ts`/`index.tsx`를 만들지 않는다 — 이름으로 역할이 드러나게 한다.
- **예외**: `/app`의 Expo Router 라우트 파일은 파일 기반 라우팅 규칙이 파일명을 결정하므로 소문자 세그먼트와 `index.tsx`·`[id].tsx`·`_layout.tsx`를 그대로 쓴다.

### 네이밍

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 클래스 / 인터페이스 | PascalCase, 명사형 | `GearStore`, `BagDispatcher` |
| 메서드 / 변수 | camelCase, 동사로 시작 | `getGearStore()` |
| 이벤트 핸들러 | `handle` 접두사 | `handleClick`, `handleSubmit` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY`, `DEFAULT_PAGE_SIZE` |

### 코딩 스타일

- **화살표 함수 지향** — 특별한 경우 외 `function` 키워드를 쓰지 않는다.
- 비동기는 **async / await** 원칙.
- 선언문 전후, `return` 직전, 조건문 전후에 빈 줄을 넣는다.
- **if 문에는 항상 `{}`를 쓴다** — 단일 구문이라도 생략 금지.

### Enum

- 문자열 리터럴 유니언(`type Foo = 'A' | 'B'`) 대신 **string enum**(`enum Foo { A = 'A', B = 'B' }`)으로 선언한다. 숫자 enum은 금지.
- enum은 별도 파일로 분리한다 (`FooType.ts` 등 PascalCase).

### 컴포넌트 분리

- 컴포넌트가 커지면 독립적으로 렌더 가능한 UI 덩어리를 `*View.tsx`로 분리한다.
- 비즈니스 로직(상태·핸들러)이 많아지면 `use<Name>State.ts` 훅으로 추출한다 (위 "화면 구조 패턴"의 3단 래퍼와 함께 적용).

### TypeScript

- **re-export 금지** — `export { Foo } from './Foo'` / `export type { Foo } from './Foo'` 형태를 쓰지 않는다. 타입·값은 소스 파일에서 직접 import한다.

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

**실제 출시 흐름**: EAS로 iOS/Android 빌드 → 스토어에 제출/출시. 스토어 공개 버전 확인은 iTunes Lookup(`https://itunes.apple.com/lookup?bundleId=com.doublejbs.useless`)·Play Store 페이지로 가능(둘 다 공개 출시본만 노출).

**iOS 로컬 빌드 + 제출** (클라우드 대신 이 맥에서 굽는 경로):

```bash
# 저장소 루트에서. CocoaPods가 Ruby 3.4에서 인코딩으로 죽으므로 로케일을 붙인다.
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx eas-cli build --platform ios --profile production --local
npx eas-cli submit --platform ios --profile production --path build-<타임스탬프>.ipa
```

- **`.env`는 gitignore라 빌드에 들어가지 않지만 문제 없다** — EAS가 서버에 등록된 `production` 환경 변수를 주입한다(빌드 로그의 `Resolved "production" environment` 줄로 확인). `eas env:list --environment production`로 목록을 볼 수 있고, **로컬 `.env`와 값이 다를 수 있다**(로컬이 옛 값인 경우가 있었다).
- 번들에 값이 박혔는지 확인할 때 `grep`을 쓰지 말 것 — `main.jsbundle`은 **Hermes 바이트코드(바이너리)** 라 매칭이 0으로 잘못 나온다. 파이썬 등으로 바이트 검색할 것.
- `submit`에는 `eas.json`의 `submit.production.ios.ascAppId`가 필요하다(없으면 인터랙티브 모드를 요구하며 실패). **App Store Connect API 키는 레포에 넣지 않는다** — 실행 시 인자로 넘기거나 EAS에 등록해 쓴다.
- 디스크를 많이 먹는다. **10GB 이상 비워두고 시작할 것** — 부족하면 링커 단계에서 죽는다. `~/Library/Developer/Xcode/DerivedData`, `~/Library/Developer/Xcode/iOS DeviceSupport`(재연결 시 재생성), `~/Library/Caches/CocoaPods`가 회수 대상이다.
- `expo doctor`가 `app.json` 스키마 오류(`newArchEnabled`·`android.edgeToEdgeEnabled`는 SDK 57 스키마에서 제거됨)를 잡지만 **로컬 빌드는 그대로 진행된다.** 클라우드 빌드에서는 중단될 수 있다.

**EAS 빌드 실패 디버깅:**

- 먼저 `npx eas-cli build:list --platform <ios|android> --limit 1 --json --non-interactive`의 `error.errorCode`로 원인을 구분한다 — `SERVER_ERROR`("We've lost connection to the worker")는 EAS 인프라 장애라 **그냥 재시도**하면 되고, `EAS_BUILD_UNKNOWN_GRADLE_ERROR` 등 프로젝트 에러는 같은 자리에서 재발하므로 로그를 확인해 고친 뒤 재빌드한다.
- 같은 응답의 `logFiles` URL(서명 만료 900초)은 **brotli 압축 JSONL**이다: `curl -s "$URL" -o log.br && brotli -d -f log.br -o log.jsonl`로 풀고, 각 줄 JSON의 `phase`/`msg` 필드를 본다. Gradle 에러는 `RUN_GRADLEW` phase에서 `FAILURE`·`What went wrong`을 찾으면 된다.
- 네이티브 매니페스트/프로젝트 설정 수정은 `android/`·`ios/`가 gitignore라(managed 워크플로우, EAS 워커가 prebuild로 재생성) 직접 고쳐도 빌드에 반영되지 않는다 — **config plugin**으로 고치고 `npx expo prebuild -p android --no-install` 산출물로 검증한다 (`plugins/WithMlKitVisionDependencies.js` 참고).

# useless — 코드 규칙 (Liquid Depth)

> 리포지토리 루트의 `CLAUDE.md`에 이 내용을 붙여넣거나, 기존 `CLAUDE.md`의
> "디자인" 절로 합치세요. Claude Code가 매 대화마다 자동으로 읽습니다.

## 디자인 소스
- 디자인 정본은 `.claude/skills/useless-design/`입니다. UI를 만들거나 고치기 전에
  `README.md`(화면별 스펙)와 `design-system.md`(원칙)를 읽으세요.
- 값이 애매하면 추측하지 말고 `mockup-liquid-depth.dc.html`의 해당 화면을 여세요.
  목업이 픽셀 기준 정본입니다.

## 토큰
- 색·간격·모서리·그림자·타이포는 **반드시** `constants/DesignTokens.ts`의
  `Liquid*` 그룹에서 가져옵니다. 리터럴 hex(`#101012`, `#C8F244` …)를 컴포넌트에
  직접 쓰지 않습니다.
- 기존 `Acg*` 그룹은 지우지 않습니다. 아직 이식하지 않은 화면이 씁니다.
  한 화면 안에서 두 세대를 섞지는 마세요.
- 의미색(`spotBackpacking` `spotShelter` `spotCampground` `favorite` `warn*` `danger`,
  배낭 카테고리 색)은 뜻이 값에 묶여 있어 리디자인 대상이 아닙니다. 바꾸지 마세요.

## 타이포
- UI 전부 **Pretendard**. `PretendardText`를 통해서만 렌더합니다.
- **Archivo Narrow는 숫자·라틴 전용**입니다. 한글 글리프가 없어 한글 문자열에 쓰면
  글자가 깨집니다 — 무게, D-day, 기간, 진행률, 버전에만 씁니다.
- 섹션 제목은 큰 제목이 아니라 **대문자 + letterSpacing .16em 마이크로 라벨**입니다.

## 색 사용
- 액센트는 **라임 하나뿐**입니다. 라임은 **면으로만** 쓰고, 그 위 글자는 `limeOn`(잉크).
- 밝은 면 위에 라임 계열 **글자**가 필요하면 `limeInk #5C7A12`를 씁니다.
  라임을 텍스트 색으로 직접 쓰지 마세요(대비 미달).
- 한 화면에 라임 면은 하나까지. 주 액션도 화면당 하나입니다.

## 레이아웃
- 화면 좌우 20px, 카드 사이 10px, 섹션 사이 26px.
- 터치 타깃 최소 44×44.
- 플로팅 탭바 아래로 콘텐츠가 흐릅니다 — 스크롤 컨테이너 하단 여백 **130px**를 비웁니다.
- 모서리: 칩·버튼은 완전한 알약(height/2), 카드 20~26px, 시트 상단만 28px. 각진 면 없음.

## 모션·상태
- 스프링 전환에는 항상 `overshootClamping: true`. 진행 바나 체크가 목표를 지나쳤다
  돌아오면 값이 틀린 것처럼 보입니다.
- 누름은 `activeOpacity 0.7~0.85`. 색을 바꾸거나 크기를 줄이지 않습니다.
- 완료된 항목은 opacity 0.6~0.65로 낮추고 목록에서 지우지 않습니다.

## 플랫폼
- 유리 면은 `expo-blur`의 `BlurView`로 만듭니다(`backdrop-filter`는 웹 표현입니다).
- 아이콘은 `@expo/vector-icons`의 **Ionicons**. 탭바만 네이티브 **SF Symbols**를 유지합니다
  — 웹 목업의 Ionicons 탭 아이콘은 대체품이니 따라 하지 마세요.
- 그림자는 RN 0.76+ `boxShadow` 문자열을 씁니다.

## 카피
- 한국어 **해요체**. 명령형(`하십시오`)이나 광고체를 쓰지 않습니다.
- 사용자를 '나'로 부릅니다 — `내 창고`, `내 정보`, `내 기록`.
- 숫자는 단위까지 한 덩어리로: `8.4kg`, `907g`, `7/12`, `D-6`.
- 같은 것은 같은 말로: 패킹 진행은 어디서나 `패킹 {n}/{m}`, 여행지는 어디서나 `여행지`.
- 빈 상태는 **사실 + 다음 걸음** 두 줄.
- **이모지를 쓰지 않습니다.** 예외는 등록된 박지를 표시하는 `📍` 접두 하나뿐입니다.

## PR 전 자가 점검
- [ ] 컴포넌트에 리터럴 hex가 없다
- [ ] Archivo Narrow가 한글 문자열에 쓰이지 않았다
- [ ] 라임이 글자색으로 쓰이지 않았다
- [ ] 44 미만 터치 타깃이 없다
- [ ] 스프링에 `overshootClamping`이 빠지지 않았다
- [ ] 스크롤 하단 여백 130px가 있다
- [ ] 패킹 진행값이 홈·배낭 목록·패킹 헤더에서 같은 소스를 쓴다
