# 구독 (여행 오프라인 저장)

| 항목 | 내용 |
| --- | --- |
| 상태 | proposed (2026-09-27 기획 · **2026-10-10 개정**: 혜택을 **여행 오프라인 저장 하나**로 — 광고는 당분간 넣지 않기로 해 광고 제거 혜택 제거, 7일 무료 체험, 권한 이름 `premium`) |
| ID 프리픽스 | `SUB` |
| 주요 코드 | `[제안]` 모델 `model/subscription/`: `SubscriptionStore.ts`(상태·구매·복원·계정 연결), `PurchasesModule.ts`·`PurchasesModule.web.ts`(네이티브 모듈 `RNPurchases` 가드·웹 스텁), `RevenueCatKeys.ts`(공개 SDK 키), `SubscriptionConstants.ts`, `SubscriptionGateContract.ts`, `PurchaseResult.ts`, `RestoreResult.ts`, `SubscriptionOfferingStatus.ts` · 진입점(SUB-9) `model/subscription/OpenSubscription.ts`(설정·광고 링크·안내가 함께 쓰는 구독 화면 열기), `SubscriptionEntryPoint.ts`(`from` 값), `SubscriptionNudge.ts`(누적 노출·한 번 뜨는 안내 시트 요청), `SubscriptionNudgeAction.ts`, `components/subscription/SubscriptionNudgeSheetView.tsx`(안내 시트 호스트, `app/_layout.tsx` 최상위), `components/ads/SingleAdSlotView.tsx`(광고 아래 링크), `components/ads/useAdImpressionTracking.ts`(`CommunityAdCardView.tsx`·`FeedAdCellView.tsx`가 노출을 센다) · 광고 `model/ads/AdService.ts`(`isConsentFlowActive`)·`AdService.web.ts`·`AdServiceContract.ts`·`AdSlotList.ts`, `components/ads/useAdSlotListState.ts`·`useSingleAdSlotState.ts` · 화면 `app/subscription/index.tsx` → `components/subscription/SubscriptionWrapper.tsx` → `SubscriptionView.tsx`(`SubscriptionOfferView.tsx`·`SubscriptionActiveView.tsx`·`SubscriptionRestoreButtonView.tsx`·`useSubscriptionState.ts`), `app/_layout.tsx`(시트 등록) · 설정 `app/info/index.tsx` · 탈퇴 `app/info/delete/index.tsx` · 앱 `model/app/App.ts` · 서버 `lessismore` 레포 `functions/subscription.js` |
| 관련 스펙 | [Ads.md](Ads.md), [Offline.md](Offline.md), [DataModel.md](DataModel.md) DM-31, [Auth.md](Auth.md)(탈퇴·처리방침), [Analytics.md](Analytics.md) |

## 1. 개요

월 구독 하나로 앱의 광고([Ads.md](Ads.md) AD-1의 다섯 자리)를 모두 끈다(2026-09-27 사용자 결정). 결제는 스토어 인앱 구독(Apple·Google)이고, 구매·갱신·검증은 **RevenueCat**이 맡는다. 앱은 RevenueCat SDK로 구독 여부를 바로 판단하고, 운영·통계용으로 **RevenueCat 웹훅 → 우리 Cloud Function → Firestore** 경로로 구독 상태를 서버에 남긴다(Firebase 확장은 쓰지 않는다).

**2026-10-15 개정 — 혜택은 오프라인 저장, 코스 그리기(무료 1개 초과분, SUB-12), 위성 지도(SUB-13) 셋이다.** **2026-10-14 개정 — 혜택은 오프라인 저장과 코스 그리기(무료 1개 초과분, SUB-12) 둘이다.** **2026-10-10 개정 — 이 구독의 혜택은 여행 오프라인 저장([Offline.md](Offline.md)) 하나다.** 광고는 당분간 넣지 않기로 했으므로(2026-10-10 사용자 결정) 광고 제거는 혜택이 아니다. 위 개요의 "광고를 모두 끈다"는 `[이력]`이며, 광고가 다시 들어오면 그때 혜택으로 더한다(SUB-4·SUB-9 광고 쪽 항목은 `[보류]`). 상품은 월 구독 하나이고 **7일 무료 체험**으로 시작한다(SUB-10). 구독의 이름은 `useless 플러스`(2026-10-10 확정). 웹에는 오프라인 저장이 없으니 구독도 없다.
## 2. 화면 및 진입

```
app/subscription/index.tsx → SubscriptionWrapper → SubscriptionView (구독 화면, 시트형 모달)
```

- 진입 경로: 설정(정보 탭) `useless 플러스` 행(구독 중이면 `useless 플러스 구독 중` → 관리 상태), **배낭 상세 `오프라인` 타일 게이트**(SUB-11). ~~한 장짜리 광고 아래 링크, 한 번 뜨는 안내(SUB-9)~~ `[보류 — 광고 미도입]`.
- 로그인하지 않은 사용자는 행을 누르면 로그인으로 보낸다(SUB-3).

## 3. 요구사항

### SUB-1 상품 `[제안]`

**수용 기준**

- 상품은 **월 자동 갱신 구독 하나**다. 스토어 상품 ID `useless_plus_monthly`(iOS·Android 같은 값, 아래 참고), iOS 구독 그룹 `useless 플러스`.
- RevenueCat 권한(entitlement) ~~`no_ads`~~ → **`premium`** 하나에 두 스토어 상품을 묶고(2026-10-10 개정 — 혜택이 둘이라 이름을 혜택 하나에 묶지 않는다. 아직 출시 전이라 RevenueCat 설정만 바꾸면 된다. 코드 상수 `NO_ADS_ENTITLEMENT_ID` → `PREMIUM_ENTITLEMENT_ID`), 오퍼링 `default`에 월 패키지를 둔다. 스토어 상품 ID는 **`useless_plus_monthly`**로 둔다(광고 제거가 혜택이 아니므로 `no_ads` 이름을 쓰지 않는다. 스토어에 이미 `useless_no_ads_monthly`가 만들어져 있다면 그것을 그대로 쓰고 표시 이름만 바꾼다 — `[확인 필요: ASC·Play에 상품 생성 여부]`).
- **가격은 스토어에서 정한다.** 앱은 가격을 하드코딩하지 않고 SDK가 준 현지화 가격 문자열을 그대로 쓴다.
- ~~무료 체험·할인 오퍼는 두지 않는다.~~ → **7일 무료 체험을 둔다**(2026-10-10 사용자 결정, SUB-10). 스토어의 도입 오퍼(introductory offer, 무료 체험 7일)로 구성하며 할인 오퍼는 두지 않는다.

### SUB-2 구독 화면 `[제안]`

**수용 기준**

- **미구독 — 전체 화면 안내**(2026-10-13 개정, 사용자 요청: AllTrails Peak 체험 화면처럼 전체 화면 + 기능 설명. `[이력]` 그 전까지는 짧은 모달 시트): 라우트 `presentation: fullScreenModal`, 세로 스크롤, 아래 순서로 쌓는다.
  1. **히어로** — 화면 폭 전체·높이 약 38%의 **비대화형 지도**(`AppMapView interactive=false`, [Map.md](Map.md) MAP-2) 위에 **코스 UI**를 올린다(2026-10-13 사용자 요청 "지도에 코스 UI 표시"). 우선순위: ① 다가오는 여행(가장 가까운 `location`이 있는 배낭)에 코스가 있으면 **그 코스를 실제로** — 코스 선(`MapRoutePathLayersView`), 출발·도착 말풍선, 포인트 마커(compact) — 코스 상자에 맞춘다. ② 코스가 없으면 여행지(없으면 북한산 37.6586/126.9778) 중심 줌 12에 **예시 코스**를 코스 화면과 같은 시각 문법으로(파란 선 + 흰 테두리, 출발·도착 말풍선, 물보급·쉼터·주의 포인트 마커 3개 — 지도 위 SVG 오버레이, 지형과 무관한 일러스트라는 뜻으로 지명 라벨과 겹치지 않는 위치에 고정 비율로 둔다). 라임 핀은 두지 않는다(주 액션 알약과 라임이 둘이 된다 — HM-8). 아래쪽 1/3은 순백 **그라디언트 페이드**(지면과 이어진다). 지도를 못 그리면(오프라인·모듈 없음) 연회색 면만. 좌상단에 흰 원형 **닫기 ×**(44pt, 그림자 — 지도 위 플로팅 허용). 출처는 지도 자체의 attribution(좌하단 ⓘ)이 맡는다.
  2. **배지** `useless 플러스`(연회색 칩 + 아이콘, 가운데 정렬).
  3. **제목** 두 줄(화면 제목 단, 가운데): `산에 가세요?` / `첫 7일은 무료예요.` — 체험 자격이 없으면 `산에서는 데이터가 끊겨요.` / `useless 플러스로 미리 챙기세요.`
  4. **가격 줄** 가운데: 체험 자격 있으면 `7일 무료, 그다음 월 {가격}`, 없으면 `월 {가격}`(SUB-10). 상품 로드 실패 시 `상품 정보를 불러오지 못했어요` + `다시 시도`.
  5. **체험 카드**(`체험은 이렇게 진행돼요`, 연회색 면·모서리 12 — 체험 자격 있을 때만): 세 단계 타임라인(아이콘 + 선) — `오늘: 모든 기능이 열려요` · `5일째: 체험 종료 알림을 보내 드려요`(SUB-10 로컬 알림) · `7일째: 월 {가격}이 결제돼요`. 자격 없으면 카드 대신 한 줄 `구독하면 바로 쓸 수 있어요`.
  6. **기능 설명** 4개 행(썸네일 64 + 제목 + 설명 두 줄, 헤어라인 구분 — HM-8 행 문법): ① `여행을 통째로 저장` / `코스·장비·날씨·박지 주의사항을 기기에 담아 데이터 없이도 열어요` ② `오프라인 지도` / `등고선·지형 음영이 든 지도를 저장해 산에서도 내 위치를 봐요` ③ `산에서 패킹 체크` / `오프라인에서 체크한 내용은 연결되면 자동으로 반영돼요` ④ `지도 포인트` / `물보급·쉼터·주의 구간을 코스 위에 찍어 두고 오프라인에서도 봐요`. 썸네일은 토큰 면(`Acg.controlFill`) 위 아이콘(`cloud-download-outline`·`map-outline`·`checkbox-outline`·`location-outline`) — 사진·가짜 지도는 쓰지 않는다.
  7. **심사 필수 표시**(3.1.2) — 스크롤 맨 아래: 자동 갱신 안내 문구, `구매 복원`, 이용약관·개인정보 처리방침 링크.
  - **하단 고정 바**(스크롤 위에 떠 있음, 순백 면 + 위 헤어라인): 주 액션 라임 알약(체험 자격 있음 `7일 무료로 시작` / 없음 `구독하기`; 화면당 라임 하나 — HM-8) + 그 아래 메타 한 줄 `언제든 해지할 수 있어요`. 스크롤 콘텐츠 하단 패딩은 이 바 높이만큼.
  - `[이력]` 짧은 시트 시절 문구: 혜택 두 줄(`여행을 저장해 데이터가 없는 산에서도 봐요` / `코스·내 위치·장비·날씨·박지 주의사항까지`), 가격 줄 `7일 무료 체험 후 월 {가격}`. 자동 갱신 안내 문구: `구독은 매월 자동으로 갱신되며, 현재 기간이 끝나기 24시간 전까지 스토어 설정에서 해지할 수 있어요. 결제는 구매 확인 시 스토어 계정으로 청구돼요.`
  - 가격·기간·자동 갱신·해지 방법·약관 링크·구매 복원은 **App Store 심사 필수 표시**다(가이드라인 3.1.2). 빠뜨리지 않는다.
- 구독 중: 제목 `useless 플러스 구독 중` · 날짜 줄은 다음 갱신일(체험 중이면 그 자리에 `무료 체험 중 · {종료일}부터 월 {가격}`)(또는 해지 예약 시 `{날짜}까지 이용`) · `구독 관리`(스토어 구독 관리 화면으로 이동) · `구매 복원`.
- 상품을 불러오지 못하면(네트워크·스토어 오류) 가격 자리에 오류 한 줄 + `다시 시도`. 구독하기는 비활성.
- 구매 진행 중에는 버튼을 막고 진행 표시. 사용자가 스토어 창에서 취소하면 아무 알림 없이 원래 화면.
- 구매 성공 → 토스트 `오프라인 저장을 쓸 수 있어요` → 화면 닫기. 오프라인 진입점에서 왔으면 **닫힌 뒤 바로 저장을 시작**한다(SUB-11).
- 시트 문법·타입·토큰은 HM-8. `PretendardText`, 44pt 터치 타깃, 아이콘 버튼 `accessibilityLabel`.

### SUB-3 계정 연결 `[제안]`

**수용 기준**

- **구매는 로그인한 사용자만** 한다. 구독이 Firebase 계정(uid)에 묶여야 기기 변경·재설치·다른 플랫폼 로그인 후에도 이어지고, 웹훅이 uid로 Firestore에 쓸 수 있다.
- 로그인 직후 `Purchases.logIn(uid)`, 로그아웃 시 `Purchases.logOut()`. 앱 시작 시 이미 로그인돼 있으면 초기화와 함께 `logIn(uid)`.
- RevenueCat 익명 사용자(`$RCAnonymousID:`)로 구매하는 경로를 만들지 않는다.
- **구독은 처음 구매한 uid에 묶어 둔다** — RevenueCat 프로젝트 설정 *Transferring purchases seen on multiple App User IDs* = **`Keep with original App User ID`**(샌드박스도 같은 규칙, 별도 동작 끔). 기본값 `Transfer to new App User ID`로 되돌리지 않는다(2026-10-15 변경).
  - 근거: 기본값에서는 로그아웃해 있는 동안 SDK가 영수증을 동기화하면 구독이 익명 ID로 옮겨 가고, 원래 계정으로 다시 로그인해도 미구독으로 보였다(TestFlight 116에서 재현, 구매 복원으로만 회복).
  - 결과: 같은 Apple 계정으로 **다른 useless 계정**에서 구매 복원하면 거절된다(구독 하나를 계정 여럿이 나눠 쓰지 않게 — 의도된 동작). 지금은 일반 복원 실패 문구(`subscription.restoreError`)가 뜬다 `[제안: 2.0.3에서 '다른 계정에 연결된 구독' 안내로 구분]`.

### SUB-4 광고 끄기 `[보류 — 광고 미도입(2026-10-10)]`

> 광고를 넣지 않기로 해 이 항목은 보류한다. 구독 판단 소스(아래 첫 항목)는 SUB-11 오프라인 게이트가 그대로 쓴다.

**수용 기준**

- 앱의 구독 판단 소스는 **RevenueCat SDK의 `customerInfo.entitlements.active.premium`**(구 `no_ads`) 다. 체험 중도 권한이 살아 있으므로 같은 판단이다. Firestore(DM-31)는 앱의 광고 판단에 쓰지 않는다(웹훅이 몇 초 늦어도 결제 직후 광고가 바로 꺼져야 한다).
- 구독 중이면 `AdService`가 **광고를 요청하지 않고**, UMP·추적 안내 시트·ATT도 띄우지 않는다(AD-3의 동의 흐름을 시작하지 않는다). 이미 받은 광고는 해제하고 자리를 접는다.
- 구독 상태를 알기 전(앱 시작 직후 SDK 응답 전)에는 광고를 요청하지 않는다 — 구독자에게 광고가 한 번 번쩍이지 않게. SDK는 마지막 상태를 기기에 캐시하므로 대기는 짧다. SDK가 실패하면(모듈 없음·네트워크) **미구독으로 본다**(광고는 AD-5대로 언제나 없어도 되는 요소라, 반대로 막히는 쪽이 더 나쁘다).
- 상태 변화(갱신·만료·환불)는 `addCustomerInfoUpdateListener`로 받아 즉시 반영한다. 앱이 포그라운드로 돌아올 때 한 번 갱신한다.
- 구독 중이면 설정의 `광고 개인정보 설정` 행(AD-3 재진입 입구)을 숨긴다 — 광고가 없으니 고칠 동의도 없다. 구독이 끝나면 AD-3 규칙대로 다시 보인다.

### SUB-5 구매 복원·관리 `[제안]`

**수용 기준**

- `구매 복원` → `Purchases.restorePurchases()`. 권한이 살아나면 토스트 `구독을 복원했어요`, 없으면 알럿 `복원할 구독이 없어요`.
- `구독 관리` → iOS `https://apps.apple.com/account/subscriptions`, Android Play 구독 관리(`https://play.google.com/store/account/subscriptions?package=com.doublejbs.useless&sku=useless_plus_monthly`).

### SUB-6 서버 기록(웹훅) `[제안]`

**수용 기준**

- `lessismore` 레포에 HTTPS 함수 `revenuecatWebhook`(asia-northeast3)을 둔다. RevenueCat 대시보드의 웹훅 URL로 등록한다.
- **인증**: RevenueCat 웹훅 설정의 Authorization 헤더 값과 함수 시크릿(`REVENUECAT_WEBHOOK_AUTH`, Secret Manager — 레포에 두지 않는다)이 일치할 때만 처리한다. 불일치 → 401.
- 이벤트의 `app_user_id`가 uid다. 익명 ID(`$RCAnonymousID:`)면 무시(200).
- 처리 이벤트: `INITIAL_PURCHASE`·`RENEWAL`·`UNCANCELLATION`·`PRODUCT_CHANGE` → 활성, `CANCELLATION` → 활성 유지 + 해지 예약(`willRenew=false`, 환불로 인한 취소면 즉시 비활성), `EXPIRATION` → 비활성, `BILLING_ISSUE` → 활성 유지 + `billingIssue=true`, `TRANSFER` → 이전 uid 비활성·새 uid 활성, `SUBSCRIPTION_EXTENDED`(스토어가 기간을 늘려 줌) → 활성 + 새 만료 시각. `TEST` 등 그 밖의 이벤트는 200으로 무시.
- **탈퇴한 계정**: Firebase Auth에 없는 uid의 이벤트는 쓰지 않고 200(탈퇴 뒤 늦게 온 이벤트가 문서를 되살리지 않게, SUB-7).
- **멱등·순서**: 같은 `event.id`를 두 번 받아도 결과가 같다. 이벤트 시각(`event_timestamp_ms`)이 문서의 `lastEventAt`보다 오래되면 무시한다(재전송·순서 뒤바뀜).
- 쓰기는 DM-31 `subscriptions/{uid}`에만 한다. 처리에 성공하면 200, 일시 오류면 5xx(RevenueCat이 재시도한다).

### SUB-7 탈퇴 `[제안]`

**수용 기준**

- 회원 탈퇴 시 `subscriptions/{uid}`를 지운다(기존 탈퇴 정리 함수와 같은 트리거에 추가).
- **스토어 구독은 앱이 해지할 수 없다.** 구독 중인 사용자가 탈퇴하려 하면 탈퇴 확인 알럿에 `구독은 탈퇴해도 해지되지 않아요. 스토어 설정에서 먼저 해지해 주세요.` 한 줄과 `구독 관리` 동작을 더한다.

### SUB-9 구독 진입점 `[보류 — 광고 미도입(2026-10-10)]`

> 광고 아래 링크·누적 노출 안내 시트는 광고가 없으므로 보류한다. 현재 진입점은 설정 행과 오프라인 타일 게이트(SUB-11) 둘이다.

설정 행 하나로는 구독이 있다는 걸 알기 어렵다(2026-09-27 사용자 결정). 광고를 보는 자리에서 조용히 알린다.

**수용 기준**

- **공통 조건**: 구독 기능이 켜져 있고(키·네이티브 모듈 있음, 웹 아님) **미구독**일 때만 보인다. 누르면 구독 화면(SUB-2)을 연다 — 로그인하지 않았으면 로그인부터(SUB-3).
- **한 장짜리 광고 아래 링크**: 홈·장비 상세의 광고 카드([Ads.md](Ads.md) AD-1) **바로 아래, 광고 뷰 바깥**에 오른쪽 정렬 글자 링크 `광고 없이 보기 ›` 한 줄(메타 글자 `AcgType.meta` · 잉크 · 셰브론, 터치 영역 44pt). 광고를 받지 못해 자리가 접히면 링크도 없다.
  - 광고 뷰(`NativeAdView`) 안에 넣지 않는다 — 광고 요소와 겹치거나 광고 클릭으로 오인되면 AdMob 정책 위반이다. 탐색·검색 그리드와 커뮤니티 피드의 목록 사이 광고에는 두지 않는다(목록 흐름을 끊지 않게).
- **한 번 뜨는 안내 시트**: 광고가 **누적 20번** 그려진 뒤(자리 5곳 합산, 기기에 기록) 광고가 있는 화면에서 **딱 한 번** 바텀 시트를 띄운다(2026-09-27 사용자 결정 — 토스트는 몇 초 만에 사라져 가격·버튼을 읽기 어렵다).
  - 그려진 = 광고 뷰가 마운트된 시점(화면 밖에 미리 그려진 목록 셀 포함). 같은 광고 객체는 한 번만 센다.
  - 구성: 제목 `광고 없이 쓰기` · 본문 `광고가 불편하세요? 월 {가격}에 앱의 모든 광고를 없앨 수 있어요.`(가격을 모르면 `광고가 불편하세요? 구독하면 앱의 모든 광고를 없앨 수 있어요.`) · 주 액션 `구독 알아보기`(라임 — 이 시트의 유일한 주 액션, HM-8) → 시트를 닫고 구독 화면(SUB-2) · 보조 `괜찮아요`(글자 버튼) → 닫기.
  - **닫을 수 있다**: 스와이프·바깥 탭·`괜찮아요`·안드로이드 뒤로가기(추적 안내 시트와 달리 권한 요청 앞 단계가 아니다).
  - 한 번 띄우면(어떻게 닫든) **다시 뜨지 않는다**(띄우는 순간 기기에 기록). 동의 흐름(UMP·추적 안내 시트·ATT)이나 다른 시트·모달이 떠 있으면 띄우지 않고 다음 광고 때 다시 확인한다.
  - 시트 문법·타입·토큰은 HM-8(추적 안내 시트와 같은 모양). `PretendardText`, 44pt 터치 타깃.

### SUB-10 7일 무료 체험 `[제안]`

**수용 기준**

- 스토어 도입 오퍼로 **무료 체험 7일**을 구성한다(App Store Connect 구독 → 도입 혜택 → 무료 체험 1주 / Play Console 기본 요금제 → 무료 체험 7일). RevenueCat은 이를 패키지의 `introPrice`로 돌려주고, 체험 중 `entitlements.active.premium.periodType == 'TRIAL'`이다.
- **자격**: 스토어 계정당 한 번이다(Apple ID·Google 계정 기준 — 앱이 아니라 스토어가 판단). 앱은 `Purchases.checkTrialOrIntroductoryPriceEligibility`로 자격을 묻고, 자격이 있으면 체험 문구·`7일 무료로 시작` 버튼, 없으면(이미 썼거나 판단 불가) `월 {가격}`·`구독하기`로 그린다. 자격 조회가 실패하면 **없는 쪽으로** 그린다(없다고 했는데 체험이 붙는 것은 괜찮고, 있다고 했는데 바로 결제되는 것은 안 된다). **Android는 `checkTrialOrIntroductoryPriceEligibility`가 항상 UNKNOWN을 돌려주므로**(2026-10-11 구현 확인) 상품의 `defaultOption.freePhase` 존재로 자격을 판단한다 — Play는 자격 있는 오퍼만 내려준다. iOS는 API 결과 + 도입가 0원일 때만 체험으로 본다.
- 체험 시작도 **구매**다 — 로그인 필수(SUB-3), 스토어 결제 시트가 뜨고, 7일 뒤 자동으로 월 요금이 청구된다는 안내를 가격 줄 아래에 적는다: `체험 기간이 끝나면 월 {가격}이 자동으로 청구돼요. 체험 중 언제든 스토어 설정에서 해지할 수 있어요.`(심사 필수 표시 — 3.1.2).
- 체험 중 해지하면 체험 종료일까지 권한이 유지된다(스토어 규칙) — 화면은 `{종료일}까지 이용`.
- **체험 종료 알림**(2026-10-13 `[제안]`): 체험 시작(구매 성공·`periodType == 'TRIAL'`) 시 **5일째 오전 9시** 로컬 알림 하나를 예약한다 — 제목 `useless 플러스 무료 체험이 이틀 뒤 끝나요`, 본문 `{종료일}부터 월 {가격}이 결제돼요. 계속 쓰지 않으려면 스토어 설정에서 해지해 주세요.`(가격을 모르면 가격 조각 생략). 탭하면 구독 화면. 체험이 유료로 전환되거나 만료·환불로 권한이 사라지면(`customerInfo` 갱신) 알림을 지운다. 알림 권한이 없으면 예약하지 않는다(요청도 하지 않는다 — 구독 화면에서 권한을 묻지 않는다). [Notification.md](Notification.md) NT-13.
- 서버 기록(DM-31)에 `isTrial`을 둔다(웹훅 `period_type`). 측정은 SUB-8의 `click_subscription_purchase`(`result=success`)에 `is_trial`(`'true'`/`'false'`) 파라미터를 더한다.

### SUB-11 오프라인 저장 게이트 `[제안]`

**수용 기준**

- 오프라인 저장([Offline.md](Offline.md) OF-2)의 **저장·갱신·열람 모두 권한 `premium`이 살아 있을 때만** 한다(체험 포함). 만료되면 저장본 열람도 잠긴다(OF-7, 2026-10-10 사용자 결정).
- 미구독 상태에서 배낭 상세 `오프라인` 타일을 누르면 구독 화면(SUB-2)을 **오프라인 진입점 변형**으로 연다: 제목 아래 한 줄 `이 여행을 저장하면 산에서도 코스·장비·날씨를 볼 수 있어요`, 혜택 두 줄 중 오프라인 줄을 먼저 둔다. 로그인하지 않았으면 로그인부터(SUB-3). `SubscriptionEntryPoint`에 `Offline`을 더한다.
- 구매(체험 시작) 성공 → 시트가 닫히면 **그 여행의 저장을 바로 시작**한다(OF-2) — 사용자가 하려던 일을 끝내 준다. 취소·실패면 아무 일도 없다. 구현: `openSubscription(SubscriptionEntryPoint.Offline, { onEntitled })` — 콜백은 구매·체험 시작·**복원** 성공으로 권한이 생겼을 때 시트가 닫힌 뒤 1회 호출되고, 시트가 권한 없이 닫히면 버려진다(2026-10-11).
- 구독 중 타일은 게이트 없이 바로 저장한다. 구독이 끝나면 타일·여행 탭 배너·오프라인 상세 진입이 모두 같은 게이트로 보낸다(OF-7).
- 설정(정보 탭) `useless 플러스` 행도 같은 구독 화면을 연다(일반 변형). 광고 쪽 진입점(SUB-9)은 보류.

### SUB-12 코스 그리기 게이트 `[제안]`

**수용 기준**

- 코스 그리기([RouteDraw.md](RouteDraw.md) RD-8)는 플러스 혜택이다. 무료 사용자는 평생 1개를 그리고 그 코스를 계속 수정할 수 있다.
- 새로 그리기·다른 그린 코스 수정을 누르면 구독 화면을 **코스 그리기 진입점 변형**으로 연다: 제목 아래 한 줄 `코스를 몇 번이든 그리고 고칠 수 있어요`, 기능 행에서 `코스 그리기`를 맨 위로. `SubscriptionEntryPoint`에 `RouteDraw`를 더한다. 권한을 얻어 닫히면 그리던 일(그리기 시작·수정 시작)을 바로 이어 간다(SUB-11과 같은 `onEntitled`).
- 구매 성공 토스트는 진입점에 맞춘다: 코스 그리기 진입이면 `코스를 마음껏 그릴 수 있어요`(오프라인 진입은 기존 `오프라인 저장을 쓸 수 있어요`, 설정 진입은 `useless 플러스를 시작했어요`).
- 측정 `from`에 `route_draw` 추가(SUB-8).
- 페이월 기능 설명(SUB-2 ⑥)에 행 추가: `코스 그리기` / `지도에 점을 찍으면 등산로를 따라 코스가 이어져요`(아이콘 `create-outline`). 4행 → 5행.

### SUB-13 위성 보기 게이트 `[제안]`

**수용 기준**

- 위성 보기([Map.md](Map.md) MAP-7)는 플러스 혜택이다(무료 사용 없음). 미구독자가 지도 종류 메뉴에서 `위성`을 누르면 구독 화면을 **위성 진입점 변형**으로 연다: 제목 아래 한 줄 `위성 사진으로 능선과 길을 직접 확인하세요`, 기능 행에서 `위성 지도`를 맨 위로. `SubscriptionEntryPoint`에 `Satellite = 'satellite'`를 더한다. 권한을 얻어 닫히면 그 지도를 바로 위성으로 바꾼다(SUB-11과 같은 `onEntitled`). 구매 성공 토스트 `위성 지도를 볼 수 있어요`.
- 페이월 기능 설명(SUB-2 ⑥)에 행 추가: `위성 지도` / `위성 사진 위에 코스를 얹어 능선·바위·숲길을 확인해요`(아이콘 `layers-outline`). 5행 → 6행.
- 측정 `from`에 `satellite` 추가(SUB-8).

### SUB-8 측정 `[제안]`

**수용 기준**

- `logClick('subscription_open', { from })` — 구독 화면 진입(`from`: `settings` | `ad_card` | `nudge` | `offline` | `route_draw` | `satellite` — 오프라인 타일 게이트 SUB-11, 코스 그리기 게이트 SUB-12, 위성 보기 게이트 SUB-13; `ad_card`·`nudge`는 SUB-9 보류로 당분간 나오지 않는다).
- `logClick('subscription_nudge', { action })` — 한 번 뜨는 안내 시트(SUB-9) 결과(`action`: `shown` | `open` | `dismiss`).
- `logClick('subscription_purchase', { result })` — `result`: `success` | `cancelled` | `pending` | `error`. `pending`은 결제 승인 대기(iOS Ask to Buy·안드로이드 보류 결제)다 — 알럿 `결제 승인을 기다리고 있어요. 승인되면 오프라인 저장을 쓸 수 있어요.`를 띄우고, 승인되면 권한 리스너가 광고를 끈다.
- `logClick('subscription_restore', { result })` — `result`: `restored` | `none` | `error`.
- 매출·구독자 수는 RevenueCat 대시보드와 DM-31이 소스다. Analytics에 금액을 남기지 않는다.

## 4. 데이터

- 쓰기·읽기 경로: [DataModel.md](DataModel.md) DM-31 `subscriptions/{uid}`.
- 앱은 이 문서를 **읽지도 쓰지도 않는다**(SUB-4). 운영·통계용이다 — 용도가 정해지면(관리자 화면 등) 그때 읽기 규칙을 넓힌다.
- RevenueCat **공개 SDK 키**(`appl_…`/`goog_…`)는 번들에 들어가는 공개값이라 `model/subscription/`의 한 파일에 둔다. 웹훅 인증 값·RevenueCat 비밀 API 키는 레포에 두지 않는다.

## 5. 플랫폼 분기

- iOS·Android: 위 전부. 새 네이티브 모듈(`react-native-purchases`)이라 **새 바이너리가 필요하다 — OTA로 나갈 수 없다.** OTA로 옛 바이너리에 번들이 가도 크래시하지 않게 네이티브 모듈 존재를 먼저 확인한다(Ads.md AD-5와 같은 가드).
- 웹: 구독 화면·설정 행을 두지 않는다. `.web.ts` 스텁.

## 6. 출시 전 준비 (사용자가 직접)

- App Store Connect: 유료 앱 계약·세금·은행 정보, 구독 그룹 `useless 플러스` + 상품 `useless_plus_monthly`(가격·현지화 이름·심사 스크린샷) + **도입 혜택 무료 체험 1주**(SUB-10), App Store Server Notifications V2 URL을 RevenueCat이 안내하는 값으로.
- Play Console: 결제 프로필, 구독 `useless_plus_monthly` + 기본 요금제(월 자동 갱신) + **신규 고객 무료 체험 7일 오퍼**(SUB-10), 실시간 개발자 알림(Pub/Sub)을 RevenueCat 안내대로.
- RevenueCat: 프로젝트·두 앱 등록(iOS는 App Store Connect API 키 인앱 구매용, Android는 Play 서비스 계정 JSON), entitlement `premium`(두 스토어 상품 연결), 오퍼링 `default`(current, `$rc_monthly` 패키지), 웹훅 URL·Authorization 값.
- 개인정보 처리방침: 결제 처리(Apple·Google·RevenueCat) 항목 추가. 이용약관: 구독·해지·환불 조항.
- App Store 개인정보 라벨: `구매 내역`(앱 기능·분석, 사용자와 연결됨) 추가. Play 데이터 보안: `구매 기록` 추가.

## 7. 수동 검증 체크리스트

- [ ] iOS 샌드박스 계정·Android 라이선스 테스터로 구매 → 광고 즉시 사라짐, `subscriptions/{uid}.active=true`가 수 초 안에 생김
- [ ] 앱 재설치 → 로그인 → 광고 없음(복원 없이도 `logIn`으로 이어짐)
- [ ] 샌드박스 만료(가속 갱신) → 광고 다시 나옴, Firestore `active=false`
- [ ] 스토어 창 취소 → 알림 없이 원래 화면
- [ ] 구독 중 설정 행·관리 화면·탈퇴 알럿 문구
- [ ] 비로그인 → 로그인으로 이동
- [ ] 웹훅: 잘못된 Authorization → 401, 같은 이벤트 두 번 → 결과 같음, 오래된 이벤트 → 무시
- [ ] OTA로 옛 바이너리(구매 모듈 없음)에 번들 → 크래시 없음, 광고 정상
