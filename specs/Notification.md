# 알림 (로컬 리마인더 + 원격 푸시)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-07-05 구현) |
| ID 프리픽스 | `NT` |
| 주요 코드 | `model/notification/`, `app/_layout.tsx`, `model/bag/`·`model/store/BagStore.ts`(예약 트리거) |
| 관련 스펙 | [Bag.md](Bag.md), [BagDetail.md](BagDetail.md), [AppLifecycle.md](AppLifecycle.md), [DataModel.md](DataModel.md) |

## 1. 개요

두 종류의 알림을 제공한다.

- **로컬 리마인더** — 기기에서 예약되는 알림. 서버 불필요(`expo-notifications`). 여행 D-1 패킹 알림, 여행 후 사용 여부 기록 유도.
- **원격 푸시** — FCM으로 수신하는 공지. 앱은 권한/토큰 등록·수신만 담당하고, **발송은 Firebase 콘솔에서 수동**으로 한다(백엔드 코드 없음). `@react-native-firebase/messaging`.

> **배포 주의**: 네이티브 모듈(expo-notifications, RNFirebase messaging) 추가라 **OTA 불가** — 새 EAS 빌드(다음 버전, 예: 1.1.7)가 필요하다. iOS는 APNs 인증 키를 Firebase 프로젝트(`lessismore-7e070`)에 등록해야 원격 푸시가 동작한다(사용자 콘솔 작업). Android는 기존 `google-services.json`으로 동작.
>
> **빌드 제약(1.1.7에서 실제로 겪음):**
> - **Android 매니페스트 병합 충돌** — expo-notifications와 `@react-native-firebase/messaging`이 `com.google.firebase.messaging.default_notification_color`를 서로 다른 값(`@color/notification_icon_color` vs `@color/white`)으로 선언해 `:app:processReleaseMainManifest`가 실패한다. config plugin `plugins/WithFirebaseMessagingNotificationColor.js`가 앱 값에 `tools:replace="android:resource"`를 붙여 해소한다(app.json plugins에 등록됨).
> - **iOS Push capability** — `ios.entitlements`에 `aps-environment`(production)를 넣어도, Apple 개발자 포털 App ID에 Push Notifications capability가 켜지고 **프로비저닝 프로파일이 재발급**돼 있어야 빌드가 통과한다. EAS `--non-interactive`는 Apple capability 동기화를 건너뛰므로, 최초 1회는 인증된(`eas build -p ios --profile production`, Apple 로그인) 실행으로 프로파일을 재발급해야 한다.
> - 의존성 추가 후 `package-lock.json`을 반드시 갱신·커밋한다(EAS는 `npm ci`라 lock 불일치 시 Install dependencies 단계에서 실패).

## 2. 구성

- 전역 매니저: `NotificationManager` — `app.getNotificationManager()`로 접근(기존 매니저 패턴). 권한 요청, 로컬 예약/취소, FCM 토큰·수신 처리를 담당.
- 초기화: `app.initialize()`에서 인스턴스화, `app/_layout.tsx`에서 권한 요청 및 리스너 등록.
- **웹은 전 기능 no-op** — 네이티브 모듈은 네이티브에서만 로드(웹 번들 제외, `AnalyticsManager` 패턴과 동일).

## 3. 요구사항

### NT-1 권한 요청 및 초기화

**수용 기준**

- 앱 시작 후(로그인·약관 동의 완료 이후) 알림 권한을 1회 요청한다. iOS/Android 공통 1개 권한으로 로컬·원격 모두 커버.
- 권한 거부 시: 로컬 예약·원격 수신을 시도하지 않고 조용히 통과(앱 동작에 영향 없음, 알럿 강제 금지).
- 포그라운드 알림 표시 핸들러를 설정한다(앱이 열려 있어도 배너 표시).
- 알림 예약/전송 관련 실패는 fire-and-forget으로 무시(콘솔 경고만).
- 웹에서는 no-op.

### NT-2 로컬 리마인더 — 여행 D-1 패킹

**수용 기준**

- 배낭 `startDate` **전날 저녁(기본 19:00)**에 로컬 알림을 예약한다. **제목·내용을 분리**해 잠금화면에서 제목(굵게) + 내용으로 표시한다: 제목 `{배낭이름} 여행 하루 전!` / 내용 `패킹을 확인해보세요`.
- 예약 식별자는 배낭 ID 기반으로 결정적으로 만든다(예: `bag-{id}-packing`) — 저장소 없이 취소/재예약 가능.
- 예약 시점이 이미 과거면 예약하지 않는다.
- 알림 탭 시 해당 배낭 상세(`/bag/{id}`)로 이동한다.

### NT-3 로컬 리마인더 — 여행 후 사용 여부 기록

**수용 기준**

- 배낭 `endDate` **다음날 21:00**에 로컬 알림을 예약한다. 제목·내용 분리: 제목 `{배낭이름} 여행 잘 다녀오셨나요?` / 내용 `사용한 장비를 확인해보세요.`.
- 식별자 `bag-{id}-useless`. 과거면 예약 안 함.
- 알림 탭 시 사용 여부 기록 화면(`/useless/{id}`)으로 이동한다.

### NT-4 리마인더 스케줄 관리

**수용 기준**

- **배낭 생성/날짜 수정 시**: 해당 배낭의 두 리마인더(NT-2·NT-3)를 기존 식별자로 취소 후 새 날짜로 재예약한다.
- **배낭 삭제 시**: 해당 배낭의 리마인더를 모두 취소한다.
- 예약은 권한이 허용되고 **해당 유형 설정(NT-6)이 켜져 있을 때만** 수행한다.
- 로컬 리마인더는 기기 종속 — 재설치/기기 변경 시 사라질 수 있음(**known issue로 수용**, 서버 동기화 안 함).

### NT-5 원격 푸시 (수동 공지)

**수용 기준**

- 권한 허용 시 FCM 등록 토큰을 획득하고, 전체 공지 수신을 위해 토픽 `all`을 구독한다.
- Firebase 콘솔(Cloud Messaging)에서 토픽 `all` 또는 앱 전체 대상 공지를 발송하면 기기에서 수신·표시된다.
- 포그라운드 수신 시에도 배너로 표시(NT-1 핸들러).
- 푸시 페이로드에 `route`(딥링크 경로)가 있으면 탭 시 해당 경로로 이동, 없으면 앱만 연다.
- 개인 식별 정보는 페이로드·토큰 저장에 넣지 않는다. (수동 발송이라 서버 토큰 저장은 하지 않음 — 토픽 구독으로 타깃.)
- 공지 알림 설정(NT-6)이 꺼져 있으면 토픽 `all`을 구독 해제한다.

### NT-6 사용자별 알림 설정

사용자는 알림 유형을 개별로 켜고 끌 수 있다.

**수용 기준**

- 정보 탭([Auth.md](Auth.md) AU-4)에 `알림 설정` 진입점을 두고, 3개 토글을 제공한다:
  `여행 패킹 알림`(NT-2), `사용 여부 기록 알림`(NT-3), `공지 알림`(NT-5 원격).
- 기본값: 권한 허용 상태에서 3개 모두 **ON**.
- 토글 OFF 동작:
  - 패킹/사용기록 → 해당 유형의 예약된 로컬 알림을 모두 취소하고 이후 예약하지 않는다. 다시 ON → 현재 배낭들 기준으로 재예약.
  - 공지 → 토픽 `all` 구독 해제. ON → 재구독.
- 설정은 **기기 로컬 저장**(AsyncStorage 등). 로컬 리마인더가 기기 종속이므로 설정도 기기 단위(재설치 시 초기화 — known issue).
- OS 레벨에서 앱 알림이 꺼져 있으면 앱 내 토글과 무관하게 표시되지 않음(별도 처리 없음).

## 4. 데이터

- 로컬 리마인더: **저장 없음**(식별자 규칙으로 관리).
- 원격 푸시: 서버 토큰 저장 없음(토픽 `all` 구독으로 콘솔 발송 타깃). [DataModel.md](DataModel.md) 변경 없음.

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 로컬 알림 | expo-notifications | expo-notifications | no-op |
| 원격 푸시 | RNFirebase messaging + **APNs 키 필요** | RNFirebase messaging (google-services.json) | no-op |
| 모듈 로드 | 네이티브 정적 | 네이티브 정적 | 웹 번들에서 제외(동적 require 분기) |
| 권한 | `expo-notifications` 권한 API | Android 13+ POST_NOTIFICATIONS 런타임 권한 | — |

## 6. 엣지 케이스

- **권한 거부/미결정**: 예약·구독 skip, 조용히 통과.
- **비로그인**: 로컬 리마인더는 배낭이 있어야 예약되므로 자연히 해당 없음. 원격 공지는 로그인 무관 수신 가능.
- **날짜가 과거인 배낭**: 리마인더 예약 안 함.
- **오프라인/전송 실패**: 무시(fire-and-forget).

## 7. 수동 검증 체크리스트

- [ ] 앱 첫 실행 시 알림 권한 요청, 거부해도 앱 정상
- [ ] 내일 시작하는 배낭 생성 → D-1 패킹 리마인더 예약(개발 중 짧은 오프셋으로 실제 배너 확인)
- [ ] 배낭 날짜 수정 → 리마인더 재예약(중복 없이 1건씩)
- [ ] 배낭 삭제 → 예약된 리마인더 취소
- [ ] 로컬 알림 탭 → 배낭 상세 / 사용여부 화면으로 이동
- [ ] 정보 탭 `알림 설정`에서 유형별 토글 → OFF 시 해당 알림 취소/미예약·구독 해제, ON 시 재예약/재구독
- [ ] Firebase 콘솔에서 토픽 `all` 테스트 발송 → 기기 수신, 탭 시 앱 진입
- [ ] 웹 빌드가 네이티브 모듈로 깨지지 않고, 웹에서 알림 호출이 no-op

## 8. 결정 사항 / 미해결 질문

**결정됨**

- 권한 요청 시점: **앱 시작 후 1회 일괄**.
- 리마인더 시각: 패킹 **전날 19:00**(NT-2) / 사용기록 **다음날 21:00**(NT-3).
- 문구(2026-07-06 제목·내용 분리): NT-2 제목 `{배낭이름} 여행 하루 전!` / 내용 `패킹을 확인해보세요`, NT-3 제목 `{배낭이름} 여행 잘 다녀오셨나요?` / 내용 `사용한 장비를 확인해보세요.` — 이미 예약된 알림은 예약 시점 payload 고정이라 재예약(배낭 생성/날짜 수정/설정 토글) 전까지 옛 형식으로 표시됨.
- 사용자별 알림 설정(NT-6): 범위 **포함**.
- 로컬 리마인더 기기 종속(재설치 시 소실): **known issue로 수용**, 서버 동기화 안 함.

**미해결**

- 일간 리마인더(초기 선택 안 함)는 추후 논의.
