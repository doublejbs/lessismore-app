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
- 확인 버튼 핸들러는 async를 지원하고, 완료 후 자동으로 닫힌다. **실패했을 때의 규약은 APP-9가 정본이다.**
- 확인만 있는 **단일 버튼 알림**은 `notify()`를 쓴다(APP-9).
- `AlertView`는 앱 루트에서 1회 렌더된다(APP-10 — 예전에는 `components/Layout.tsx`에서만 렌더돼 `Layout`을 쓰지 않는 화면이 개별로 얹어야 했다).

### APP-4 전역 Toast

**수용 기준**

- `ToastManager.show / showLong / showSimple` — 메시지 + 옵션 버튼.
- Android: `ToastAndroid`(네이티브 토스트). iOS/Web: 커스텀 `ToastView`(하단 고정, 3초 자동 닫힘, Layout에서 bottom 100).

### APP-5 탭 네비게이션

**수용 기준**

- 탭 4개: `창고`(house) / `탐색`(magnifyingglass) / `배낭`(figure.hiking) / `정보`(person). 활성 색상 검정.
- **네이티브 탭바**: `expo-router`의 `NativeTabs`(unstable-native-tabs)로 렌더 — iOS는 네이티브 `UITabBar`(iOS 26 리퀴드 글래스·`minimizeBehavior='onScrollDown'` 자동), Android는 머티리얼 네이티브 탭. tint/아이콘 색 검정, 라벨색 선택 검정/비선택 #8E8E93. 아이콘은 iOS SF Symbol(`sf`) + Android drawable. (기존 JS 탭바 HapticTab/NoAnimationTab/TabBarBackground/IconSymbol은 미사용.)

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

### APP-8 커스텀 시트 전환과 Reduce Motion `[제안]`

앱의 커스텀 시트 열림·닫힘은 공용 `hooks/useSheetTransition.ts`를 사용해
일관된 전환감과 접근성 설정을 제공한다.

**수용 기준**

- `BottomMenuModalView`, `LogInView`, `AnnouncementSheetView`, `FeaturePopupSheetView`의
  `translateY` 전환은 `Animated.spring`을 사용한다. 스프링은
  `stiffness: 300` · `damping: 26` · `mass: 1` · `overshootClamping: true`로
  오버슈트 없이 정착하며 `useNativeDriver`를 유지한다.
- 네 시트의 딤은 `Animated.timing`으로 약 220ms 페이드하고, 열림·닫힘 모두
  현재 애니메이션 값에서 이어진다.
- `AccessibilityInfo.isReduceMotionEnabled()`와 `reduceMotionChanged` 리스너를
  공용 훅에서 읽는다. Reduce Motion이 켜져 있으면 시트 위치 전환을 생략하고
  약 200ms의 페이드만 수행한다.
- 네이티브 `animationType='slide'`인
  `SearchGearAddToBagModalView`, `CampSiteBagSelectSheetView`,
  `FeedFilterSheetView`는 일반 전환을 유지하되 Reduce Motion이 켜져 있으면
  `animationType='fade'`를 사용한다.

**수동 검증 체크리스트**

- [ ] 네 커스텀 시트 열림·닫힘이 바운스 없이 스프링으로 정착하고 딤이 함께 페이드된다.
- [ ] 시트가 열리거나 닫히는 중 상태가 바뀌어도 현재 위치에서 이어진다.
- [ ] iOS Reduce Motion 켜짐 → 커스텀 시트는 위치 이동 없이 짧은 페이드만 하고,
      네이티브 세 시트는 fade로 표시된다.
- [ ] iOS Reduce Motion을 시트 표시 중 변경 → 다음 전환부터 즉시 정책이 반영된다.

### APP-9 알럿 확인 콜백 실패 규약 `[제안]`

전역 알럿의 확인 콜백이 실패해도 **알럿은 반드시 닫히고, 사용자는 실패했음을 안다.**
실패를 흡수하는 책임은 **`AlertManager`에 있고, 호출측은 자체 try/catch를 두지 않아도 안전하다.**

**(a) 현재 무엇이 어떻게 죽는가** (2026-08-17 클릭 전수 점검)

- `AlertManager.confirm()`이 `await this.onConfirm()` 뒤에 `hide()`를 부른다. `onConfirm`이 reject하면
  `hide()`에 도달하지 못해 **알럿이 화면에 박힌다.** `AlertView`는 딤 탭으로 닫히지 않으므로(오버레이에
  닫기 제스처가 없다) iOS에서는 **빠져나갈 길이 아예 없다** — Android 하드웨어 뒤로가기(`onRequestClose`)만
  살아 있다. 실패 안내도 없고, `AlertView`가 `confirm()`을 await·catch 없이 부르므로 unhandled rejection이 난다.
- 영향 경로는 확인 콜백에 try/catch가 없는 곳 전부다: 배낭 목록 카드 삭제(`model/bag/Bag.ts`),
  배낭 상세 삭제(`components/bag-detail/BagDetailView.tsx`), 배낭 상세 장비 행 스와이프 빼기
  (`model/bag-detail/BagDetail.ts`), 창고 장비 스와이프 삭제(`components/warehouse/WarehouseGearView.tsx`
  → `model/warehouse/Warehouse.ts`), 검색 화면의 창고 삭제(`model/search/SearchWarehouse.ts`),
  장비 편집 삭제(`model/gear/edit/GearEdit.ts`), 정보 탭 로그아웃(`app/(tabs)/info.tsx`).
  네트워크 실패·권한 오류·로그인 만료 어느 것이든 같은 결과가 된다.
- 파생 버그: **메모 삭제 실패 알럿이 뜨는 즉시 사라진다.** `model/bag/BagMemo.ts`는 자체 catch 안에서
  `alertManager.show()`로 새 알럿을 여는데, 그 직후 같은 tick에서 `confirm()`의 `hide()`가 실행돼
  방금 켠 알럿을 끈다(`AlertManager`는 인스턴스가 하나이고 `visible`이 단일 플래그다).
- `AlertManager`에 **단일 버튼(알림) 모드가 없다** — 실패 안내처럼 선택지가 하나인 알럿에도
  `취소하기`가 붙어(`components/alert/AlertView.tsx`) 무엇이 취소되는지 모를 버튼이 남는다.

**(b) 기대 동작**

- 확인 콜백이 실패하면 **알럿을 닫는다.** 열어 둔 채 인라인 에러를 보이는 쪽은 채택하지 않는다 —
  이 알럿은 딤 이탈 경로가 없어 열린 채로 두면 화면이 잠기고, 재시도 수단(버튼 상태·에러 자리)이
  컴포넌트에 없다. 사용자는 원래 화면으로 돌아가 같은 액션을 다시 시도하면 된다.
- 실패는 **토스트로 알린다.** 알럿을 다른 알럿으로 교체하지 않는다 — 위 `BagMemo` 파생 버그가 정확히
  그 패턴이고, 매니저 인스턴스가 하나라 "닫기"와 "새로 열기"가 같은 플래그를 다툰다.
  토스트는 별도 매니저(`ToastManager`, APP-4)라 알럿 닫힘과 경합하지 않는다.
- **호출측은 아무것도 하지 않아도 된다.** 지금은 규약이 호출측에 위임돼 `BagMemo`·`components/bag/BagView.tsx`
  두 곳만 안전한 상태다. 규약을 매니저로 올려 나머지 7개 경로가 코드 변경 없이 안전해진다.
- 선택지가 하나인 알럿은 취소 버튼을 그리지 않는다.

**(c) 수용 기준**

- [ ] `AlertManager.confirm()`은 `try { await onConfirm() } catch { 실패 안내 } finally { hide() }` 구조다 —
      **콜백 성공·실패와 무관하게 항상 알럿이 닫힌다.**
- [ ] `confirm()`은 **어떤 경우에도 reject하지 않는다.** 호출측(`AlertView`)이 await·catch 없이 불러도
      unhandled rejection이 발생하지 않는다.
- [ ] 실패 시 토스트를 띄운다. 기본 문구는 `요청을 처리하지 못했어요. 다시 시도해주세요.`이고,
      `show()`의 선택 옵션 `failureMessage`로 도메인 문구를 지정할 수 있다(삭제 계열은
      `삭제하지 못했어요. 다시 시도해주세요.`). 옵션을 주지 않아도 기본 문구가 나가므로
      기존 호출측은 수정 없이 안전하다.
- [ ] 호출측이 이미 자체 try/catch로 실패를 처리하는 경우(`BagMemo` 등) 콜백이 reject하지 않으므로
      매니저의 실패 경로에 도달하지 않는다 — **같은 실패를 두 번 알리지 않는다.**
- [ ] 확인 콜백 안에서 `alertManager.show()`로 **새 알럿을 열지 않는다**(같은 tick에서 `hide()`에 꺼진다).
      기존에 그렇게 쓰던 곳(`model/bag/BagMemo.ts` 메모 삭제 실패)은 토스트로 바꾼다 —
      **메모 삭제 실패 안내가 화면에 남아야 한다**([BagDetail.md](BagDetail.md) BD-6).
- [ ] 확인 콜백 실행 중에는 확인·취소 버튼을 비활성화한다. 연타로 콜백이 중복 실행되거나
      진행 중 취소로 경합이 생기지 않는다.
- [ ] **단일 버튼 알림**: `AlertManager.notify({ message, confirmText })`는 확인 버튼만 있는 알럿을 띄운다.
      확인 버튼은 풀폭이고 콜백은 닫기뿐이다. 내부적으로는 `show()`의 `cancelable`(기본 `true`) 옵션이
      `false`로 들어간 형태이며, `AlertView`는 `cancelable === false`면 취소 버튼을 렌더하지 않는다.
      Android 하드웨어 뒤로가기(`onRequestClose`)는 확인과 동일하게 닫기로 처리한다.
- [ ] 위 7개 경로에서 확인 콜백이 실패하도록 만들어도(네트워크 차단 등) 알럿이 닫히고 토스트가 뜬다.

### APP-10 전역 오버레이는 루트에서 1회 마운트한다 `[제안]`

로그인 시트·Alert·Toast는 **어느 화면에서도 보인다**. 화면이 개별로 얹지 않는다.

**(a) 현재 무엇이 어떻게 죽는가**

- 세 오버레이(`LogInView`·`AlertView`·`ToastView`)는 `components/Layout.tsx`에서만 렌더된다.
  `Layout`을 쓰지 않는 화면은 자기 손으로 얹어야 하고, **빠뜨리면 매니저 상태만 켜지고 아무것도 안 보인다.**
- 실제로 빠졌다: 배낭 상세(`components/bag-detail/BagDetailView.tsx`)는 `ToastView`·`AlertView`만
  직접 얹었고 `LogInView`가 없다(`app/_layout.tsx`·`app/(tabs)/_layout.tsx`에도 없다). 그래서
  **비로그인 상태에서 `⋯` 메뉴의 `복사`·`템플릿으로 저장`이 완전히 죽는다** — `logInAlertManager.show()`는
  불리지만 시트를 그리는 뷰가 없어 탭이 무반응이다([BagDetail.md](BagDetail.md) BD-11).
- 같은 파일에 이미 "`Layout`을 쓰지 않아 알럿을 그리는 뷰가 없다 — 직접 얹는다"는 주석이 있다.
  즉 이 함정은 한 번 밟은 뒤에도 **로그인 시트에는 적용되지 않았다.** 화면마다 기억해야 하는 구조라
  화면이 늘 때마다 재발한다.

**(b) 기대 동작**

- 세 오버레이를 **앱 루트(`app/_layout.tsx`)에서 한 번** 마운트한다. 초기화 완료 후 `Stack` 위에 얹는다.
- 화면·`Layout`은 오버레이를 렌더하지 않는다. 화면이 새로 생겨도 아무것도 하지 않아도 동작한다.
- **중복 마운트 위험**: 같은 매니저를 두 뷰가 관찰하면 RN `Modal`이 두 겹 뜨고 하나를 닫아도 다른 하나가
  남는다(토스트는 같은 메시지가 두 번 보인다). 그러므로 루트 마운트를 **추가하는 동시에** 기존 마운트
  지점을 모두 걷어야 한다 — 남겨 두고 추가하면 지금보다 나쁘다.

**(c) 수용 기준**

- [ ] `app/_layout.tsx`가 `LogInView`·`AlertView`·`ToastView`를 `Stack` 위에 1회 렌더한다.
      스플래시 구간(`!loaded || !isInitialized`)에서는 렌더하지 않는다 — 매니저가 아직 없다(APP-1).
- [ ] `components/Layout.tsx`와 화면별 직접 마운트(배낭 상세·패킹 등)에서 세 오버레이를 제거한다.
      앱 전체에서 각 오버레이 컴포넌트의 사용처가 **정확히 한 곳**이다.
- [ ] `Layout`을 쓰지 않는 화면(배낭 상세·패킹·박지 상세 시트 등)에서 알럿·토스트·로그인 시트가
      모두 정상 표시된다.
- [ ] 알럿·토스트가 두 겹으로 뜨지 않는다(중복 마운트 회귀 확인).
- [ ] 토스트 하단 오프셋은 루트에서 단일 기본값(100) + 하단 세이프에어리어로 계산한다.
      화면별 값이 필요하면 매니저 옵션으로 받는다(화면이 뷰를 따로 얹는 방식으로 되돌리지 않는다).
- [ ] 네이티브 시트·`formSheet` 라우트가 떠 있는 상태에서도 루트 오버레이가 그 위에 보인다
      (RN `Modal`은 화면 계층 최상위에 붙는다 — iOS·Android 양쪽에서 확인).

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
- [ ] `[제안]` 네트워크를 끊고 배낭 삭제·장비 삭제·로그아웃의 확인 알럿을 확정 → 알럿이 닫히고 실패 토스트가 뜬다(알럿이 화면에 남지 않는다) — APP-9
- [ ] `[제안]` 메모 삭제를 실패시키면 실패 안내가 화면에 **남는다**(뜨자마자 사라지지 않는다) — APP-9
- [ ] `[제안]` 단일 버튼 알림(`notify`)에 `취소하기`가 없고 확인 버튼이 풀폭이다 — APP-9
- [ ] `[제안]` 비로그인으로 배낭 상세 `⋯` → `복사` / `템플릿으로 저장` 탭 → 로그인 시트가 뜬다 — APP-10
- [ ] `[제안]` 알럿·토스트가 두 겹으로 뜨지 않는다(루트 1회 마운트 회귀) — APP-10

## 8. 미해결 질문

- 초기화 실패 시 무한 스플래시 — 재시도/에러 안내 정책 필요.
- `Constants.expoConfig.version`(정보 탭 노출)은 cosmetic이라 실제 EAS appVersion과 다를 수 있음 — 사용자 노출 버전의 기준 결정 필요.
- **2026-08-17 클릭 이벤트 전수 점검의 나머지 항목은 이번 범위(APP-9·APP-10 및 각 도메인 대응 요구사항) 밖이다** — ① 44×44pt 미달 터치 타깃, ② 성공·실패 피드백이 없는 액션 8건, ③ 리스너·구독 누수, ④ 웹 전용 결함 2건. 기능이 완전히 죽지는 않아 요구사항으로 승격하지 않았고, 별도 감사로 다룬다.
- `PretendardText`의 `extraBold` weight는 `Pretendard-ExtraBold` 폰트를 참조하지만 해당 폰트는 로드되지 않는다(현재 사용처 없어 실해는 없음) — 로드 추가 또는 옵션 제거.
