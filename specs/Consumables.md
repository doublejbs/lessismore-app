# 소모품 추천

| 항목 | 내용 |
| --- | --- |
| 상태 | proposed (2026-10-07 기획 — 제품 결정은 모두 2026-10-07 사용자 결정) |
| ID 프리픽스 | `CP` |
| 주요 코드 | `[제안]` `model/consumable/`(`ConsumableProduct.ts`·`ConsumableCategory.ts`·`ConsumableSurface.ts`·`ConsumableCardVariant.ts`·`ConsumableSlotConstants.ts`), `model/store/ConsumableStore.ts`, `components/consumable/`(`ConsumableCardView.tsx`·`ConsumableCarouselSectionView.tsx`·`CommunityConsumableCardView.tsx`·`CoupangDisclaimerView.tsx`), `components/bag-detail/`, `components/home/HomeView.tsx`, `components/community/feed/CommunityView.tsx`, `components/warehouse-detail/WarehouseDetailPurchaseView.tsx`, `scripts/curate-consumables.mjs` |
| 관련 스펙 | [DataModel.md](DataModel.md) §1·DM-3·DM-32·DM-12, [GearDetail.md](GearDetail.md) GD-5·GD-5a·GD-5b, [BagDetail.md](BagDetail.md) BD-10·BD-12, [Home.md](Home.md) HM-8·HM-11·HM-14·HM-16, [Community.md](Community.md) CM-1·CM-11·CM-15, [Ads.md](Ads.md) AD-1·AD-2, [Analytics.md](Analytics.md) AN-3, [Localization.md](Localization.md) L10N-3, [Packing.md](Packing.md) PK-7 |

## 1. 개요

백패킹은 장비 말고도 매번 다시 사야 하는 **소모품**(이소가스, 물티슈, 휴지, 마이비데, 샤워티슈 등)이 있다. 이 앱은 장비와 여행을 다루지만 소모품을 챙기는 동선은 없었다. 운영자가 직접 고른 소모품 몇 가지를 **쿠팡 파트너스 링크가 붙은 카드**로 세 자리 — **배낭(여행) 상세 · 홈 탭 · 커뮤니티 탭** — 에 노출해, 출발 전에 빠뜨리기 쉬운 것을 한 번 더 떠올리게 하고 앱의 커머스 수익을 장비 상세(GD-5) 밖으로 넓힌다.

**범위** — 운영자 수동 큐레이션 목록만 다룬다. 카드의 상품 썸네일은 쿠팡 CDN 이미지를 직접 렌더한다([DataModel.md](DataModel.md) §1 예외 경계).

**출시 경로**(2026-10-07 사용자 결정) — **2.0.1 production OTA로 먼저 내보낸다.** 따라서 이번 구현은 JS만으로 성립해야 한다: 새 네이티브 모듈·권한·`app.json` 변경 금지, 이미 설치된 `expo-image`·RN `Linking`·`FlatList`만 쓴다. 작업 브랜치는 2.0.1 OTA 기준 브랜치(`hotfix/2.0.1-route-endpoint-labels`)에서 따고, 출시 후 `develop`으로 머지한다. 광고([Ads.md](Ads.md))는 2.0.2 바이너리 기능이라 2.0.1에는 없다 — CP-6의 광고 간격 규칙은 2.0.2에서 적용된다.

**범위 밖**(2026-10-07 사용자 결정): 패킹 준비물([Packing.md](Packing.md) PK-7)과의 연결, 소모품 전용 목록 화면, 소모품 검색, 가격 표시, API·행동 기반 자동 추천, 소모품 리뷰.

## 2. 화면 및 진입

이 도메인은 독립 화면이 없다. 세 화면에 섹션·카드로 얹힌다.

```
ConsumableStore (세션당 1회 조회, 세 자리 공유)
  ├─ app/bag/[id] → BagDetailView
  │    └─ ConsumableCarouselSectionView (`출발 전 소모품`, BD-10 액션 그리드 바로 아래)   — CP-4 / BD-12
  ├─ app/(tabs)/index.tsx → HomeView
  │    └─ ConsumableCarouselSectionView (`챙겨갈 소모품`, HM-11 아래 마지막 섹션)          — CP-5 / HM-16
  └─ app/(tabs)/community.tsx → CommunityView
       └─ CommunityConsumableCardView (게시글 10개마다 한 장)                             — CP-6 / CM-15

카드 탭 → Linking.openURL(coupangUrl) → 쿠팡 앱(설치 시) 또는 브라우저                       — CP-3
```

- 장비 상세의 쿠팡 행 썸네일(CP-8 / [GearDetail.md](GearDetail.md) GD-5b)은 소모품이 아니라 카탈로그 장비의 기존 쿠팡 링크이며, 카드 문법(CP-2)과 수집 스크립트(CP-7)만 공유한다.

## 3. 요구사항

### CP-1 콘텐츠와 큐레이션 `[제안]`

운영자는 소모품 목록을 손으로 고르고 순서를 정한다. 앱은 고른 목록을 그대로 보여 준다.

**수용 기준**

- 소스는 `consumable-product` 컬렉션([DataModel.md](DataModel.md) DM-32)의 운영자 큐레이션 문서뿐이다. 쿠팡 API 결과·사용자 행동으로 목록을 만들지 않는다.
- **가격을 저장하지도 표시하지도 않는다**(2026-10-07 사용자 결정). 쿠팡 가격은 수시로 바뀌어 저장 값은 곧 틀린 정보가 되고, 화면마다 실시간으로 조회하기에는 파트너스 API 한도가 이 앱 전용이 아니다 — 사용자의 다른 서비스와 키를 공유하며 분당 100회, 한도 초과 경고가 3회 쌓이면 이용이 제한된다. 링크 라벨은 **`쿠팡에서 보기`** 로 통일한다(`최저가` 같은 가격 주장 없음).
- 앱은 **세션당 한 번** `published == true` 문서를 읽어 공용 스토어(`ConsumableStore`, `app.getConsumableStore()`)에 둔다. 세 자리가 같은 결과를 공유한다 — 자리마다 따로 조회하지 않는다.
  - 자리 필터(`surfaces` 포함 여부)와 정렬(`order` 오름차순, 동률은 문서 id 오름차순)은 **클라이언트에서** 한다. `published` 등치 + `order` 정렬을 서버에 함께 걸면 복합 색인이 필요하다 — `feed-content`(DM-27)가 같은 이유로 클라이언트 필터를 택했다.
  - 홈 당겨서 새로고침(CP-5)은 스토어를 다시 읽고, 그 결과는 세 자리에 함께 반영된다.
- **조회 중·조회 실패가 호스트 화면을 막지 않는다.** 배낭 상세·홈·커뮤니티는 각자 원래 속도로 그려지고, 소모품 자리는 결과가 오면 붙는다. 실패는 조용히 숨기고 개발자 로그에만 남긴다.
- 자리에 보여 줄 항목이 **0개면 그 자리를 아예 렌더하지 않는다** — 섹션 머리·고지도 남기지 않는다([Home.md](Home.md) HM-14 "빈 카드는 그리지 않는다").
- 표시 문구는 운영자 입력값(`name`·`pitch`)을 그대로 쓴다. 번역하지 않는다([Localization.md](Localization.md) — 콘텐츠는 한국어 유지).

### CP-2 카드 `[제안]`

사용자는 소모품을 썸네일·이름·한 줄 소개로 알아보고 카드 전체를 눌러 쿠팡으로 간다. 세 자리가 공용 컴포넌트 `ConsumableCardView` 하나를 쓴다.

**수용 기준**

- **썸네일**: 쿠팡 CDN URL(`imageUrl`, DM-32)을 직접 렌더한다. 우리 Storage에 사본을 두지 않는다([DataModel.md](DataModel.md) §1 경계 ①).
  - 카드 상단 **흰 밴드** + `resizeMode: contain` — 쿠팡 상품 이미지는 대부분 흰 배경이라 letterbox가 사진 배경과 이어진다([GearDetail.md](GearDetail.md) GD-5a와 같은 판단).
  - `imageUrl`이 없거나 로드에 실패하면 **같은 크기의 흰 밴드 + 가운데 아이콘**(`cart-outline`, `Acg.textMuted`)으로 떨어진다. 깨진 이미지 아이콘을 남기지 않는다. 밴드 높이를 유지해 캐러셀 안에서 카드 높이가 어긋나지 않게 한다.
- **글자**(위 → 아래):
  - 이름 — 16 medium, 두 줄까지(`AcgType` 항목 이름 단).
  - 한 줄 소개(`pitch`) — 14 `rowSubtitle` 잉크, 한 줄 말줄임.
  - 메타 — `쿠팡`(13 `AcgType.meta`, `Acg.textMuted`). **출처 표기는 필수다**([DataModel.md](DataModel.md) §1 경계 ③). 메타 조각이지 배지 면이 아니다(HM-8).
- **면**: `Acg.controlFill` + `AcgRadius.thumb`(12), **그림자 없음**, 본문 패딩 12. 흰 밴드는 카드 폭을 꽉 채우고 상단 모서리만 12로 깎는다.
- **라임을 쓰지 않는다** — 라임은 화면당 주 액션 하나(HM-8)이고, 세 호스트 화면 모두 이미 주 액션이 있다(배낭 상세 `장비 추가`, 홈 일정 CTA, 커뮤니티 `글쓰기`). 카드 자체가 눌리는 면이므로 셰브론도 두지 않는다(HM-11 카드와 같은 판단).
- **카드 전체가 하나의 터치 타깃**이다. 44pt를 넘는다(밴드 + 본문). `accessibilityRole='link'` + `accessibilityLabel` = `{이름} 쿠팡에서 보기`. 내부 요소는 따로 포커스를 받지 않는다.
- 변형은 string enum `ConsumableCardVariant`로 둘이다.
  - `Regular` — 캐러셀용(CP-4·CP-5). 카드 폭 **152 고정**, 밴드 높이 120.
  - `Compact` — 커뮤니티 카드 안 3열용(CP-6). 폭은 3등분(`flex: 1`), 밴드는 정사각, 이름은 14 medium 두 줄, **한 줄 소개를 생략**한다(3등분 폭에서 한 줄 소개는 서너 글자로 잘려 정보가 되지 않는다). 커뮤니티 카드 면(`Acg.controlFill`) 위에 놓이므로 **면을 `Acg.paper`(흰색)로 바꾼다** — 연회색 위 연회색은 보이지 않는다([Ads.md](Ads.md) AD-2 흰 보조 알약과 같은 선례).
- Dynamic Type: 고정 `height`를 쓰지 않고 밴드만 고정, 본문은 내용 높이(HM-8). 글자 확대 배율은 카드 높이가 캐러셀을 망가뜨리지 않게 `maxFontSizeMultiplier 1.5`로 둔다.

### CP-3 열기와 고지 `[제안]`

**수용 기준**

- 카드를 누르면 `click_consumable_product`(파라미터 `source`·`product_id`, [Analytics.md](Analytics.md) AN-3)를 먼저 보내고 `Linking.openURL(coupangUrl)`로 연다.
  - **인앱 브라우저로 열지 않는다.** 파트너스 링크(`link.coupang.com/a/...`)는 유니버설 링크라 쿠팡 앱이 깔려 있으면 앱으로 넘어가야 수수료 귀속이 성립한다 — 인앱 브라우저로 감싸면 그 전환이 막힌다([GearDetail.md](GearDetail.md) GD-5 쿠팡 행과 같은 이유).
  - 열기 실패는 조용히 무시한다(GD-5와 같다).
- **파트너스 고지**: `쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`를 **모든 자리의 섹션·카드 바로 아래에 상시** 표시한다 — 숨김·접힘·스크롤 끝으로 미루기 없음. fontSize 11, `textSecondary`(GD-5와 같은 값 — 링크보다 시각 위계를 낮추되 늘 보이게). 근거는 쿠팡 파트너스 운영정책의 고지 의무다.
  - 고지는 공용 `CoupangDisclaimerView` 하나로 그린다. GD-5 쿠팡 행도 같은 뷰로 옮긴다.
  - 문구 키를 **`gearDetail.coupangDisclaimer` → `commerce.coupangDisclaimer`** 로 옮긴다. 장비 상세 전용 키를 다른 도메인이 빌려 쓰면 L10N-3의 "맥락이 다르면 키를 분리한다"와 반대로, 맥락이 같은 법적 고지를 여러 키로 쪼개게 된다 — 고지 문구는 한 곳에서만 바뀌어야 한다. 근거는 [Localization.md](Localization.md) §4 문구 근거 표에 기록한다.

### CP-4 배낭 상세 자리 `[제안]`

출발을 앞둔 사용자는 배낭 상세에서 챙겨갈 소모품을 본다([BagDetail.md](BagDetail.md) BD-12).

**수용 기준**

- 섹션 제목 **`출발 전 소모품`**, 머리는 `AcgSectionHeaderView`(부제 없음).
- 자리: **BD-10 액션 그리드 바로 아래, 장비 목록(구분선·sticky 필터) 위**. 장비 목록 아래에 두면 장비가 많은 배낭에서 사실상 보이지 않고, 헤더 위에 두면 배낭의 정체성(이름·기간·무게)을 밀어낸다.
- **여행 상태가 `출발 전` 또는 `여행 중`일 때만** 보인다. `지난 여행`이면 섹션 전체(고지 포함)를 렌더하지 않는다(2026-10-07 사용자 결정) — 다녀온 여행에서 "챙겨갈 것"은 의미가 없다. 판정은 `BagDetail.getTripPhase()`를 그대로 쓴다(BD-1 상황 라벨과 같은 기준).
  - 화면을 보는 중에 날짜 수정으로 상태가 바뀌면 다음 렌더에서 함께 따라간다(별도 재조회 없음 — 판정은 클라이언트 파생).
- 항목: `surfaces`에 `bagDetail`이 있는 상품, `order` 순, **최대 10개**.
- 표현: 가로 스크롤 캐러셀, `Regular` 카드(폭 152), 카드 사이 간격 10, `snapToInterval = 카드 폭 + 간격`. 캐러셀은 좌우 패딩 바깥까지 흘린다(`marginHorizontal: -24` + `paddingHorizontal: 24`, [Home.md](Home.md) HM-11과 같은 구조). 페이지 인디케이터는 두지 않는다 — 한 화면에 카드가 두 장 이상 보여 "한 장씩 넘기는" 캐러셀이 아니다.
  - **[Home.md](Home.md) HM-11의 "홈 캐러셀은 HM-1 문법 하나"와 다른 이유**: HM-1/HM-11 카드는 한 장이 화면 폭에 가까운 "한 곳씩 소개받는" 카드라 5장이 상한이다. 소모품은 이름 한 줄짜리 상품을 **여럿 훑는 진열대**라, 같은 문법으로 10장을 두면 열 번을 밀어야 끝난다. 폭을 좁혀 두세 장이 한 번에 보이게 한다.
- 캐러셀 바로 아래 파트너스 고지(CP-3).
- **본인 배낭 상세에만** 둔다. 공유 배낭 열람(BD-7)·그룹 멤버 배낭 열람에는 두지 않는다 — 남의 여행을 보는 화면에서 내 장바구니를 권하는 것은 맥락이 맞지 않는다.
- 웹에서도 같은 규칙으로 보인다(§5).

### CP-5 홈 자리 `[제안]`

사용자는 홈 최하단에서 운영자가 고른 소모품을 훑는다([Home.md](Home.md) HM-16).

**수용 기준**

- 섹션 제목 **`챙겨갈 소모품`**, 머리는 `AcgSectionHeaderView`(부제 없음 — 제목이 이미 "무엇을 왜"를 말한다).
- 자리: 홈 스크롤의 **마지막 콘텐츠 섹션**, HM-11 `useless가 고른 박지` 아래([Home.md](Home.md) HM-14 4번).
  - 홈 광고([Ads.md](Ads.md) AD-1 `Home`, 2.0.2 예정)는 계속 스크롤 맨 끝이다 — AD-1의 "추천 박지 다음"은 "마지막 콘텐츠 섹션 다음"으로 읽고, 이 섹션이 생기면 광고는 그 아래로 간다.
- **비로그인 홈에도 노출한다** — `consumable-product` 읽기가 공개이고(DM-32) 카드 탭(외부 링크)에 로그인 분기가 없다. HM-11과 같은 판단이며 비로그인 홈의 주 액션(로그인 알약)은 그대로다.
- **로딩 중 자리를 잡지 않는다**(스켈레톤 없음) — 조회가 끝나면 아래에 붙는다. 스크롤 하단이라 점프가 시야에 걸리지 않는다(HM-14와 같은 규칙).
- 당겨서 새로고침(HM-6)에 포함한다 — 스토어를 다시 읽는다(CP-1).
- 항목: `surfaces`에 `home`이 있는 상품, `order` 순, **최대 10개**. 0개·조회 실패 → 섹션을 렌더하지 않는다.
- 표현·고지는 CP-4와 같다(`Regular` 카드 캐러셀 + 아래 고지).

### CP-6 커뮤니티 자리 `[제안]`

커뮤니티를 훑는 사용자는 게시글 사이에서 소모품 카드를 만난다([Community.md](Community.md) CM-15).

**수용 기준**

- **모양**: 게시글 카드(`CommunityFeedCardView`)와 같은 바깥 문법 — `Acg.controlFill` 면 + `AcgRadius.thumb`(12) + 패딩 16, 피드의 카드 간격 그대로([Ads.md](Ads.md) AD-2와 같은 원칙). 안에는 위 → 아래로:
  - 메타 줄 `쿠팡 파트너스` — 게시글 카드의 작성자·시각 자리에 메타 글자(`AcgType.meta`)로 둔다. **배지 면을 만들지 않는다**(HM-8). 사용자 게시글이 아니라는 것을 첫 줄에서 알린다.
  - 제목 `챙겨갈 소모품` — 게시글 제목과 같은 단.
  - **소모품 최대 3개를 가로 3열로**(`Compact` 카드, CP-2), 열 사이 간격 8.
  - 파트너스 고지(CP-3).
- **카드 바깥 면은 눌리지 않는다.** 게시글 카드와 달리 상세가 없고, 터치 타깃은 안의 소모품 카드 각각이다 — 바깥 면까지 누르게 하면 어느 상품으로 가는지 모호하다(CM-11 "중첩 탭이 함께 발생하지 않는다").
- **빈도**(2026-10-07 사용자 결정): **게시글 10개마다 그 뒤에 한 장씩 반복**(10번째 뒤, 20번째 뒤, …). **목록의 게시글이 10개 이하이면 목록 끝에 한 장**(10개 정확히일 때도 10번째 뒤 = 끝, 한 장).
  - 순번은 **페이지를 넘어 이어 센다** — 20개 페이지(CM-1)를 더 불러와도 리듬이 끊기거나 다시 시작하지 않는다. 자리는 게시글 순번 기준으로 고정해 새로고침·페이지 추가에도 위치가 튀지 않는다.
  - 필터(`전체`/`패킹`/`투표`)·정렬을 바꾸면 그 목록 기준으로 처음부터 센다(목록이 새로 시작되므로).
  - **카드마다 다른 상품을 보인다** — `surfaces`에 `community`가 있는 상품을 `order` 순으로 늘어놓고 k번째 카드는 그다음 3개를 순환해 고른다. 상품이 3개 이하면 모든 카드가 같은 상품을 보인다.
- **네이티브 광고와 한 화면에 함께 보이지 않는다**([Ads.md](Ads.md) AD-1 "한 화면에 광고가 둘 이상 동시에 보이지 않게"의 취지를 커머스 카드까지 넓힌다). 지금 광고 상수(`model/ads/AdConstants.ts`: 첫 광고 6번째 뒤, 이후 10개마다)로는 광고(6·16·26…)와 소모품 카드(10·20·30…)가 게시글 4개 간격이라 짧은 카드가 이어지면 한 화면에 걸릴 수 있다. 광고가 출시될 때(2.0.2) 두 자리를 **한 슬롯 계산**에서 함께 배치해 간격을 확보한다.
  - 소모품 자리 상수(`CONSUMABLE_COMMUNITY_INTERVAL` = 10 등)는 `model/consumable/ConsumableSlotConstants.ts` 한 곳에 두고, 광고 상수(`model/ads/AdConstants.ts`)와 같은 슬롯 계산(`AdListLayout`)이 함께 읽는다. 숫자를 두 곳에 흩지 않는다.
- **두지 않는 곳**: 조회 오류 상태·정상 빈 상태([Community.md](Community.md) CM-1 — 게시글이 0개이면 "10개 이하 → 끝에 한 장" 규칙도 적용하지 않는다), 게시글 검색 결과(CM-14), 내가 쓴 글(CM-13), 게시글 상세.
- 항목 0개·조회 실패 → 카드를 끼우지 않는다. 게시글 목록은 카드가 없을 때와 완전히 같다.

### CP-7 운영 스크립트 `[제안]`

운영자는 CSV 한 장을 고쳐 소모품 목록을 갱신한다. 상품 썸네일은 파트너스 API로 상품당 한 번만 가져온다.

**수용 기준**

- 스크립트 `scripts/curate-consumables.mjs`, 입력 `scripts/consumables.csv`(열: `name`, `pitch`, `category`, `coupangUrl`, `surfaces`(`;` 구분), `order`, `published`). [DataModel.md](DataModel.md) DM-12 관례를 따른다 — **쓰기 전 백업 JSON**(`scripts/backup-consumable-product-*.json`), **`--apply`일 때만 쓰기**(기본은 DRY-RUN 출력).
- **`productId` 확보**: 단축 링크(`link.coupang.com/a/...`) HTML을 받아 딥링크 스크립트 안의 `productId=` 값을 읽는다. 파트너스 API를 쓰지 않는다(한도 소모 0). 못 읽으면 그 행을 쓰지 않고 보고한다.
  - 문서 id는 `productId`다(DM-32). CSV에서 빠진 기존 문서는 지우지 않고 `published: false`로 내린다(되돌릴 수 있게).
- **썸네일 확보**: 쿠팡 파트너스 `products/search`를 상품 **이름으로 한 번** 호출하고(HMAC 인증), 결과 중 `productId`가 일치하는 항목의 `productImage`를 `imageUrl`로 쓴다. 일치 항목이 없으면 `imageUrl`을 비워 두고 보고한다(카드는 아이콘 폴백, CP-2).
  - **이미지가 없는 문서(신규·교체)만 호출한다.** 이미 `imageUrl`이 있는 상품은 다시 부르지 않는다 — 강제 갱신은 `--refresh-image <productId>`로 상품을 지정할 때만. 그래서 중단돼도 다시 돌리면 남은 것부터 이어진다.
  - 호출 사이 **2초 간격**, 한 번에 하나씩(병렬 금지).
  - 응답 `rCode`가 403이거나 한도 관련 메시지면 **즉시 중단하고** 지금까지 처리한 것과 남은 것을 보고한다 — 재시도하지 않는다.
- **키**: iCloud `claude/coupang-partners.env`에서 읽는다. 저장소·백업 JSON·로그에 키를 남기지 않으며 `.env`에도 복사하지 않는다(`EXPO_PUBLIC_` 접두사 금지 — 번들 인라인).
- **이 키는 사용자의 다른 서비스와 공유한다.** 분당 100회 한도와 경고 누적(3회 시 이용 제한)이 이 앱만의 것이 아니므로 호출을 최소로 둔다 — 정기 배치·전량 재수집을 만들지 않는다.
- **장비 쿠팡 썸네일 모드**(CP-8): `--gear` 옵션으로 카탈로그 `gear/{id}` 중 `coupangUrl`이 있는 문서(현재 27건, DM-3)에 같은 절차로 `coupangImageUrl`을 채운다. `coupangImageUrl`이 이미 있으면 건너뛴다.
- Firestore 쓰기 경로(인증·규칙)는 미해결이다(§8 a).

### CP-8 장비 상세 쿠팡 행 썸네일 `[제안]`

장비 상세의 쿠팡 행에도 상품 썸네일을 붙여 소모품 카드와 같은 모양으로 맞춘다([GearDetail.md](GearDetail.md) GD-5b).

**수용 기준**

- 카탈로그 `gear/{id}.coupangImageUrl`(DM-3)이 있으면 쿠팡 행을 CP-2 카드 문법(흰 밴드 + `contain` + 텍스트 줄 + 메타 `쿠팡`)으로 그린다. 텍스트 줄은 기존 라벨 `쿠팡에서 최저가 보기`를 유지한다(GD-5 — 소모품과 달리 장비 상세의 쿠팡 행은 기존 문구를 바꾸지 않는다). 카드 폭은 장비 상세 섹션 폭 전체다.
- 값이 없거나 로드에 실패하면 지금의 텍스트 행으로 떨어진다 — 빈 밴드·깨진 이미지를 남기지 않는다.
- 동작은 GD-5 그대로다 — `click_gear_purchase`(`source: coupang`) → `Linking.openURL`.
- 파트너스 고지는 계속 그 행 바로 아래 상시 노출이다(CP-3 공용 뷰).
- 값은 CP-7 `--gear` 모드가 기존 27건에 채운다. 앱은 읽기만 한다.

## 4. 데이터

- 읽기: `consumable-product/{id}`([DataModel.md](DataModel.md) DM-32), `gear/{id}.coupangImageUrl`(DM-3, CP-8). 쓰기: 운영 스크립트만(CP-7) — 앱은 아무것도 쓰지 않는다.
- 이미지: 쿠팡 CDN URL 직접 렌더, Storage 사본 없음([DataModel.md](DataModel.md) §1 쿠팡 파트너스 상품 이미지 행).
- 조회: `where('published','==',true)` 한 번 → 클라이언트에서 `surfaces` 필터 + `order` 정렬(복합 색인 없음, CP-1).
- enum: `ConsumableCategory`(`model/consumable/ConsumableCategory.ts`), `ConsumableSurface`(`model/consumable/ConsumableSurface.ts`), `ConsumableCardVariant`(`model/consumable/ConsumableCardVariant.ts`) — 모두 string enum.
- 로컬 저장 없음(세션 메모리 캐시뿐).

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 카드 탭 (`Linking.openURL`) | 유니버설 링크 → 쿠팡 앱 설치 시 앱, 아니면 Safari | App Links → 쿠팡 앱 설치 시 앱, 아니면 기본 브라우저 | 새 탭으로 쿠팡 웹 |
| 썸네일 | 쿠팡 CDN 직접 로드 | 동일 | 동일 (`<img>` 로드라 CORS 무관) |
| 애널리틱스 | 전송 | 전송 | no-op([Analytics.md](Analytics.md) §5) |

## 6. 엣지 케이스

- **비로그인**: 홈·커뮤니티 자리는 그대로 보인다(공개 읽기). 배낭 상세는 로그인 사용자만 열 수 있어 해당 없음.
- **상품 0개**(자리별): 그 자리를 렌더하지 않는다(섹션 머리·고지 포함, CP-1).
- **로딩**: 자리를 잡지 않는다. 호스트 화면을 막지 않는다.
- **조회 실패·오프라인**: 자리를 숨긴다. 홈은 당겨서 새로고침으로 다시 시도된다.
- **세션 중 운영자가 상품을 내림**: 이번 세션에는 남아 보이고, 다음 조회(앱 재시작·홈 새로고침)에서 사라진다. 실시간 구독하지 않는다.
- **이미지 404·차단**: 카드 단위 아이콘 폴백(CP-2). 자리 렌더 조건에 이미지 유무를 넣지 않는다.
- **쿠팡 링크가 죽음**(상품 판매 종료 등): 쿠팡이 자체 안내 페이지로 보낸다 — 클라이언트에서 할 일이 없다. 운영자가 CSV에서 교체한다.
- **배낭 상세를 보는 중 여행 상태가 바뀜**(날짜 수정·자정 경과): 다음 렌더에서 `getTripPhase()` 결과를 따라 나타나거나 사라진다(CP-4).
- **커뮤니티 게시글이 정확히 10개**: 10번째 뒤(= 목록 끝)에 한 장. 11~19개: 10번째 뒤 한 장, 끝에는 없음(CP-6).

## 7. 수동 검증 체크리스트

- [ ] 출발 전 배낭 상세 → 액션 그리드 바로 아래·장비 목록 위에 `출발 전 소모품` 캐러셀과 그 아래 고지가 보인다 (CP-4)
- [ ] 여행 중 배낭에서도 보이고, 지난 여행 배낭에서는 섹션·고지 모두 없다 (CP-4)
- [ ] 배낭 날짜를 지난 날짜로 수정하고 돌아오면 섹션이 사라진다 (CP-4)
- [ ] 공유 배낭 링크·그룹 멤버 배낭 열람에는 섹션이 없다 (CP-4)
- [ ] 홈 최하단(`useless가 고른 박지` 아래)에 `챙겨갈 소모품` 캐러셀 + 고지가 보인다 — 로그인·비로그인 모두 (CP-5)
- [ ] 홈 당겨서 새로고침 후 Firestore에서 내린 상품이 사라진다 (CP-1·CP-5)
- [ ] 캐러셀에 카드가 두세 장 보이고 손을 떼면 카드 단위로 멈추며, 최대 10장이다 (CP-4·CP-5)
- [ ] 커뮤니티 게시글 25개 이상 → 10번째·20번째 뒤에 소모품 카드, 다음 페이지를 불러와도 위치가 그대로다 (CP-6)
- [ ] 커뮤니티 게시글 10개 이하(필터로 좁혀 확인) → 목록 끝에 한 장 (CP-6)
- [ ] 커뮤니티 오류·빈 상태·검색 결과·내가 쓴 글에는 소모품 카드가 없다 (CP-6)
- [ ] 커뮤니티 카드 첫 줄이 `쿠팡 파트너스` 메타 글자이고 배지 면이 없으며, 바깥 면을 눌러도 아무 일도 없다 (CP-6)
- [ ] 두 번째 커뮤니티 카드가 첫 카드와 다른 상품을 보인다(상품이 4개 이상일 때) (CP-6)
- [ ] 세 자리 모두 고지 문구가 접힘 없이 상시 보인다 (fontSize 11, `textSecondary`) (CP-3)
- [ ] `imageUrl`을 일부러 깨뜨린 상품 → 깨진 이미지 없이 흰 밴드 + 아이콘, 카드 높이 유지 (CP-2)
- [ ] 카드 탭 → 쿠팡 앱이 깔린 실기기에서 쿠팡 앱으로 전환된다(인앱 브라우저 아님). 웹은 새 탭 (CP-3)
- [ ] GA4 DebugView에 `click_consumable_product`가 `source`(`home`/`bag_detail`/`community`)·`product_id`와 함께 도착 (CP-3)
- [ ] 화면에 라임이 각 화면의 기존 주 액션 하나뿐이다 (CP-2)
- [ ] VoiceOver/TalkBack: 카드 하나가 `{이름} 쿠팡에서 보기` 링크 하나로 읽힌다 (CP-2)
- [ ] 장비 상세(쿠팡 링크 있는 27건 중 하나) → 쿠팡 행에 썸네일 카드, 그 아래 고지. 값 없는 장비는 기존 텍스트 행 (CP-8)
- [ ] 장비 상세 고지 문구가 `commerce.coupangDisclaimer` 키에서 나오고 ko/en/ja 모두 표시된다 (CP-3)
- [ ] 스크립트 DRY-RUN이 쓰기 없이 결과를 출력하고, `--apply` 전에 백업 JSON이 생긴다. 재실행 시 이미 이미지가 있는 상품은 API를 부르지 않는다 (CP-7)

## 8. 미해결 질문

- **(a) 큐레이션 스크립트의 Firestore 쓰기 경로** — 목표 규칙은 "읽기 공개 · 쓰기 admin 전용"(DM-32)이지만, 클라이언트 SDK + public config로 쓰는 이 레포 스크립트 관례(DM-12)와 맞지 않는다. 선택지: ① 운영자 계정으로 로그인해 특정 uid만 쓰기 허용, ② 서비스 계정(Admin SDK) — 단 `useless-ota` admin 키는 이 프로젝트에 못 쓴다(CLAUDE.md), ③ `camp-spot`처럼 적재 시에만 콘솔에서 규칙을 임시 허용. **주의**: 레포에 보관된 배포 규칙 스냅샷(`docs/firebase/deployed/firestore.rules`, 2026-09-23 기준)은 잠근 컬렉션 목록 밖을 전부 `allow read, write`로 열어 둔다 — 규칙을 추가하지 않으면 `consumable-product`는 **누구나 쓸 수 있고**, 누구든 `coupangUrl`을 자기 파트너스 링크로 바꿔치기할 수 있다. 구현 전에 이 컬렉션을 잠금 목록에 넣는 규칙 배포(사용자 작업)가 선행돼야 한다. `feed-content`(DM-27)도 같은 절에 걸려 있는지 함께 확인이 필요하다(현재 실제 배포 상태는 미확인).
- **(b) 쿠팡 파트너스 정책상 앱 내 썸네일 사용 가능 여부** — 미확인. 파트너스 API가 이미지 URL을 제공하는 것은 홍보용 사용을 전제로 보이나, 앱 안 진열(링크 부착·출처 표기 조건, §1)이 운영정책에 맞는지 확인하지 않았다. 확인 전까지는 썸네일 없이(아이콘 폴백) 출시해도 기능은 성립한다.
- **(c) 파트너스 검색 API의 별도 호출 상한** — 사용자 확인 한도는 분당 100회이나, 검색 API(`products/search`)에는 시간당 상한이 따로 있다는 보고가 있다. 실행 전에 확인하고, 상한이 낮으면 CP-7의 이어 실행(이미지 있는 상품 건너뛰기)으로 나눠 돌린다.
- **(d) 소모품을 나중에 패킹 준비물(PK-7)과 연결할지** — 이번 범위 밖. PK-7이 구현되면 준비물 칩에서 해당 소모품 카드로 잇는 동선을 따로 기획한다.
- **(e) 광고와의 간격 수치** — CP-6의 "한 화면 동시 노출 금지"를 어떤 최소 간격(게시글 n개)으로 보장할지는 광고 출시(2.0.2) 때 실제 카드 높이로 정한다.
