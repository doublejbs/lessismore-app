# 광고 제거 구독

| 항목 | 내용 |
| --- | --- |
| 상태 | proposed (2026-09-27 기획) |
| ID 프리픽스 | `SUB` |
| 주요 코드 | `[제안]` 모델 `model/subscription/`: `SubscriptionStore.ts`(상태·구매·복원·계정 연결), `PurchasesModule.ts`·`PurchasesModule.web.ts`(네이티브 모듈 `RNPurchases` 가드·웹 스텁), `RevenueCatKeys.ts`(공개 SDK 키), `SubscriptionConstants.ts`, `SubscriptionGateContract.ts`, `PurchaseResult.ts`, `RestoreResult.ts`, `SubscriptionOfferingStatus.ts` · 진입점(SUB-9) `model/subscription/OpenSubscription.ts`(설정·광고 링크·안내가 함께 쓰는 구독 화면 열기), `SubscriptionEntryPoint.ts`(`from` 값), `SubscriptionNudge.ts`(누적 노출·한 번 뜨는 안내 시트 요청), `SubscriptionNudgeAction.ts`, `components/subscription/SubscriptionNudgeSheetView.tsx`(안내 시트 호스트, `app/_layout.tsx` 최상위), `components/ads/SingleAdSlotView.tsx`(광고 아래 링크), `components/ads/useAdImpressionTracking.ts`(`CommunityAdCardView.tsx`·`FeedAdCellView.tsx`가 노출을 센다) · 광고 `model/ads/AdService.ts`(`isConsentFlowActive`)·`AdService.web.ts`·`AdServiceContract.ts`·`AdSlotList.ts`, `components/ads/useAdSlotListState.ts`·`useSingleAdSlotState.ts` · 화면 `app/subscription/index.tsx` → `components/subscription/SubscriptionWrapper.tsx` → `SubscriptionView.tsx`(`SubscriptionOfferView.tsx`·`SubscriptionActiveView.tsx`·`SubscriptionRestoreButtonView.tsx`·`useSubscriptionState.ts`), `app/_layout.tsx`(시트 등록) · 설정 `app/info/index.tsx` · 탈퇴 `app/info/delete/index.tsx` · 앱 `model/app/App.ts` · 서버 `lessismore` 레포 `functions/subscription.js` |
| 관련 스펙 | [Ads.md](Ads.md), [DataModel.md](DataModel.md) DM-31, [Auth.md](Auth.md)(탈퇴·처리방침), [Analytics.md](Analytics.md) |

## 1. 개요

월 구독 하나로 앱의 광고([Ads.md](Ads.md) AD-1의 다섯 자리)를 모두 끈다(2026-09-27 사용자 결정). 결제는 스토어 인앱 구독(Apple·Google)이고, 구매·갱신·검증은 **RevenueCat**이 맡는다. 앱은 RevenueCat SDK로 구독 여부를 바로 판단하고, 운영·통계용으로 **RevenueCat 웹훅 → 우리 Cloud Function → Firestore** 경로로 구독 상태를 서버에 남긴다(Firebase 확장은 쓰지 않는다).

광고 제거 말고 다른 혜택은 두지 않는다. 웹에는 광고가 없으니 구독도 없다.

## 2. 화면 및 진입

```
app/subscription/index.tsx → SubscriptionWrapper → SubscriptionView (구독 화면, 시트형 모달)
```

- 진입 경로: 설정(정보 탭) `광고 제거` 행(구독 중이면 `광고 제거 구독 중` → 관리 상태), 한 장짜리 광고 아래 링크, 한 번 뜨는 안내(SUB-9).
- 로그인하지 않은 사용자는 행을 누르면 로그인으로 보낸다(SUB-3).

## 3. 요구사항

### SUB-1 상품 `[제안]`

**수용 기준**

- 상품은 **월 자동 갱신 구독 하나**다. 스토어 상품 ID `useless_no_ads_monthly`(iOS·Android 같은 값), iOS 구독 그룹 `광고 제거`.
- RevenueCat 권한(entitlement) `no_ads` 하나에 두 스토어 상품을 묶고, 오퍼링 `default`에 월 패키지를 둔다.
- **가격은 스토어에서 정한다.** 앱은 가격을 하드코딩하지 않고 SDK가 준 현지화 가격 문자열을 그대로 쓴다.
- 무료 체험·할인 오퍼는 두지 않는다(나중에 스토어·RevenueCat에서만 켜도 화면이 따라가게 SDK 값으로 그린다).

### SUB-2 구독 화면 `[제안]`

**수용 기준**

- 미구독: 제목 `광고 없이 쓰기` · 혜택 한 줄(`앱의 모든 광고를 없애요`) · 가격 줄(`월 {가격}`) · 주 액션 `구독하기`(라임, 화면당 하나 — HM-8) · `구매 복원` · 자동 갱신 안내 · 이용약관·개인정보 처리방침 링크. 자동 갱신 안내 문구: `구독은 매월 자동으로 갱신되며, 현재 기간이 끝나기 24시간 전까지 스토어 설정에서 해지할 수 있어요. 결제는 구매 확인 시 스토어 계정으로 청구돼요.`
  - 가격·기간·자동 갱신·해지 방법·약관 링크·구매 복원은 **App Store 심사 필수 표시**다(가이드라인 3.1.2). 빠뜨리지 않는다.
- 구독 중: `광고 제거 구독 중` · 다음 갱신일(또는 해지 예약 시 `{날짜}까지 이용`) · `구독 관리`(스토어 구독 관리 화면으로 이동) · `구매 복원`.
- 상품을 불러오지 못하면(네트워크·스토어 오류) 가격 자리에 오류 한 줄 + `다시 시도`. 구독하기는 비활성.
- 구매 진행 중에는 버튼을 막고 진행 표시. 사용자가 스토어 창에서 취소하면 아무 알림 없이 원래 화면.
- 구매 성공 → 토스트 `광고를 모두 없앴어요` → 화면 닫기. 광고는 즉시 사라진다(SUB-4).
- 시트 문법·타입·토큰은 HM-8. `PretendardText`, 44pt 터치 타깃, 아이콘 버튼 `accessibilityLabel`.

### SUB-3 계정 연결 `[제안]`

**수용 기준**

- **구매는 로그인한 사용자만** 한다. 구독이 Firebase 계정(uid)에 묶여야 기기 변경·재설치·다른 플랫폼 로그인 후에도 이어지고, 웹훅이 uid로 Firestore에 쓸 수 있다.
- 로그인 직후 `Purchases.logIn(uid)`, 로그아웃 시 `Purchases.logOut()`. 앱 시작 시 이미 로그인돼 있으면 초기화와 함께 `logIn(uid)`.
- RevenueCat 익명 사용자(`$RCAnonymousID:`)로 구매하는 경로를 만들지 않는다.

### SUB-4 광고 끄기 `[제안]`

**수용 기준**

- 앱의 구독 판단 소스는 **RevenueCat SDK의 `customerInfo.entitlements.active.no_ads`** 다. Firestore(DM-31)는 앱의 광고 판단에 쓰지 않는다(웹훅이 몇 초 늦어도 결제 직후 광고가 바로 꺼져야 한다).
- 구독 중이면 `AdService`가 **광고를 요청하지 않고**, UMP·추적 안내 시트·ATT도 띄우지 않는다(AD-3의 동의 흐름을 시작하지 않는다). 이미 받은 광고는 해제하고 자리를 접는다.
- 구독 상태를 알기 전(앱 시작 직후 SDK 응답 전)에는 광고를 요청하지 않는다 — 구독자에게 광고가 한 번 번쩍이지 않게. SDK는 마지막 상태를 기기에 캐시하므로 대기는 짧다. SDK가 실패하면(모듈 없음·네트워크) **미구독으로 본다**(광고는 AD-5대로 언제나 없어도 되는 요소라, 반대로 막히는 쪽이 더 나쁘다).
- 상태 변화(갱신·만료·환불)는 `addCustomerInfoUpdateListener`로 받아 즉시 반영한다. 앱이 포그라운드로 돌아올 때 한 번 갱신한다.
- 구독 중이면 설정의 `광고 개인정보 설정` 행(AD-3 재진입 입구)을 숨긴다 — 광고가 없으니 고칠 동의도 없다. 구독이 끝나면 AD-3 규칙대로 다시 보인다.

### SUB-5 구매 복원·관리 `[제안]`

**수용 기준**

- `구매 복원` → `Purchases.restorePurchases()`. 권한이 살아나면 토스트 `구독을 복원했어요`, 없으면 알럿 `복원할 구독이 없어요`.
- `구독 관리` → iOS `https://apps.apple.com/account/subscriptions`, Android Play 구독 관리(`https://play.google.com/store/account/subscriptions?package=com.doublejbs.useless&sku=useless_no_ads_monthly`).

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

### SUB-9 구독 진입점 `[제안]`

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

### SUB-8 측정 `[제안]`

**수용 기준**

- `logClick('subscription_open', { from })` — 구독 화면 진입(`from`: `settings` | `ad_card` | `nudge`).
- `logClick('subscription_nudge', { action })` — 한 번 뜨는 안내 시트(SUB-9) 결과(`action`: `shown` | `open` | `dismiss`).
- `logClick('subscription_purchase', { result })` — `result`: `success` | `cancelled` | `pending` | `error`. `pending`은 결제 승인 대기(iOS Ask to Buy·안드로이드 보류 결제)다 — 알럿 `결제 승인을 기다리고 있어요. 승인되면 광고가 사라져요.`를 띄우고, 승인되면 권한 리스너가 광고를 끈다.
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

- App Store Connect: 유료 앱 계약·세금·은행 정보, 구독 그룹 `광고 제거` + 상품 `useless_no_ads_monthly`(가격·현지화 이름·심사 스크린샷), App Store Server Notifications V2 URL을 RevenueCat이 안내하는 값으로.
- Play Console: 결제 프로필, 구독 `useless_no_ads_monthly` + 기본 요금제(월 자동 갱신), 실시간 개발자 알림(Pub/Sub)을 RevenueCat 안내대로.
- RevenueCat: 프로젝트·두 앱 등록(iOS는 App Store Connect API 키 인앱 구매용, Android는 Play 서비스 계정 JSON), entitlement `no_ads`, 오퍼링 `default`, 웹훅 URL·Authorization 값.
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
