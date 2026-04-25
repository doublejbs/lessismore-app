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

## 아키텍처

### 기술 스택

- **Expo 53** + React Native 0.79.6 + React 19 (iOS / Android / Web 모두 지원)
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

### 전역 서비스

`app` 싱글톤을 통해 접근:

- `app.getGearStore()` - 장비 CRUD 작업
- `app.getBagStore()` - 배낭 관리
- `app.getSearchStore()` - Algolia 검색
- `app.getAlertManager()` - 알림 표시
- `app.getToastManager()` - 토스트 표시
- `app.getFirebase()` - Firebase 인스턴스

## 주요 컨벤션

- 한국어 UI (커밋 메시지도 한국어 사용)
- 텍스트는 `PretendardText` 컴포넌트 사용 (커스텀 한글 폰트 — `assets/fonts/Pretendard-*.ttf`)
- 이미지는 `FirebaseImageStorage`를 통해 Firebase Storage에 업로드
- Hot Updater가 네이티브 플랫폼에서 OTA 업데이트 처리 (`hot-updater.config.ts` 참고)
- 린트 규칙은 `eslint-config-expo` 기반 + `unused-imports` 플러그인 — `_` 접두 변수는 무시됨
