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
npm run expo:clean           # 네이티브 프로젝트 클린 리빌드
```

## 아키텍처

### 기술 스택

- **Expo 53** + React Native 0.79.6 + React 19
- **MobX** 상태 관리 (`makeAutoObservable` 사용)
- **Expo Router** 파일 기반 라우팅
- **Firebase** (Auth, Firestore, Storage) + **Algolia** 검색
- **TypeScript** strict 모드

### 디렉토리 구조

- `/app` - Expo Router 페이지 (파일 기반 라우팅)
  - `(tabs)/` - 하단 탭 네비게이션 (창고, 검색, 배낭, 정보)
  - `gear-detail/[id].tsx` 같은 동적 세그먼트 라우트
- `/components` - 기능별로 정리된 재사용 가능한 UI 컴포넌트
- `/model` - MobX 스토어 및 비즈니스 로직
  - `app/App.ts` - 루트 싱글톤, 앱 시작 시 초기화
  - `store/` - 데이터 스토어 (GearStore, BagStore, ReplyStore)
  - `firebase/` - Firebase 클라이언트 초기화
  - `search/` - Algolia 검색 연동
  - `gear/`, `bag/`, `reply/` - 도메인 모델
- `/hooks` - 커스텀 React 훅
- `/constants` - 앱 상수

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

화면은 상태 초기화를 위한 래퍼 패턴 사용:

- 라우트 파일 (`app/(tabs)/index.tsx`)이 래퍼 컴포넌트 렌더링
- 래퍼가 로딩 상태와 스토어 초기화 처리
- 스크린 컴포넌트가 실제 UI 렌더링

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
- 텍스트는 `PretendardText` 컴포넌트 사용 (커스텀 한글 폰트)
- 이미지는 `FirebaseImageStorage`를 통해 Firebase Storage에 업로드
- Hot Updater가 네이티브 플랫폼에서 OTA 업데이트 처리
