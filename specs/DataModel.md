# 데이터 모델 (Firestore / Storage / Algolia)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `DM` |
| 주요 코드 | `model/store/*.ts`, `model/firebase/Firebase.ts`, `model/gear/Gear.ts`, `model/bag/BagItem.ts`, `model/reply/Comment.ts` |
| 관련 스펙 | 모든 도메인 스펙이 이 문서를 참조한다 |

## 1. 개요

앱 데이터는 Firebase 프로젝트 **`lessismore-7e070`** 의 Firestore / Storage / Auth 에 저장되고,
장비 카탈로그 검색은 **Algolia** 인덱스가 담당한다. 이 문서가 모든 컬렉션 경로·필드의 단일 정의처다.
다른 스펙에서는 경로 이름만 적고 필드 정의는 이 문서를 링크한다.

### 장비 이미지 정책 (2026-07-28 결정 → **2026-07-29 개정**)

**앱은 카탈로그 장비 이미지를 제공하지 않되, 사용자가 직접 찍어 올린 자기 장비 사진은 본인에게만 보여준다.**

2026-07-28에는 이미지를 전면 제거했다. 브랜드 공식 사이트에서 크롤링한 이미지가 저작권 리스크였고,
사용자 업로드도 함께 걷어냈다 — 업로드를 남기면 공유 배낭·후기 노출을 통해 같은 리스크가 UGC 형태로
재유입된다고 봤기 때문이다. 2026-07-29 개정은 **리스크의 원인을 "이미지"가 아니라 "남의 저작물"과
"재유포 경로"로 다시 짚는다**: 본인이 찍은 사진을 본인만 보는 것은 두 조건 어디에도 걸리지 않는다.

개정 후 규칙 — 세 갈래를 구분한다.

| 구분 | 정책 | 근거 |
| --- | --- | --- |
| **카탈로그 크롤 이미지** (`gear/{id}.imageUrl`) | **계속 미표시** | 브랜드 저작물 |
| **브랜드 링크 미리보기 이미지** (`gear/{id}.productImageUrl`) | **허용 — 브랜드 링크 미리보기 카드에서만** (2026-08-09 추가, 아래 경계 참고) | 사본을 두지 않고 브랜드 CDN이 직접 전송, 권리자가 `og:image`로 렌더를 유도 |
| **사용자 업로드** (`users/{uid}/gears/{id}.imageUrl`) | **허용 — 업로더 본인 화면에만** | 본인 저작물, 재유포 경로 없음 |
| **공유 갤러리** (DM-8, 한 장비의 사진을 모든 사용자에게) | **폐기 유지 — 재도입하지 않는다** | UGC 재유포 경로 그 자체 |

- **`[2026-08-09 추가]` 브랜드 미리보기 예외의 경계**: 이 예외는 **브랜드 링크 미리보기 카드([GearDetail.md](GearDetail.md) GD-5a) 한 곳에만** 적용된다. 장비 행·피드 카드·검색 결과 등 다른 표면으로 넓히지 않는다 — 넓히는 순간 "링크의 미리보기"라는 성격을 잃고 카탈로그 이미지 복귀가 된다. 예외를 성립시키는 조건은 셋이고 하나라도 빠지면 예외가 아니다: ① 사본을 두지 않고 **브랜드 CDN URL로 직접 렌더**, ② 그 브랜드 페이지로 가는 **링크에 부속**, ③ **출처 도메인 노출**. `imageUrl`(우리 Storage 사본)로 대체하는 것은 ①을 깨므로 금지한다.
  - 참고로 두 이미지는 **같은 파일**이다(백컨트리 시에스타 4P 실측 양쪽 208,890 B). 화면에 보이는 사진이 같아도 위 세 조건이 성립하느냐가 갈림선이다.
- **비공개 원칙**: 사용자 업로드 이미지는 **로그인한 업로더 본인의 화면에만** 나타난다. 공유 배낭 링크([BagDetail.md](BagDetail.md) BD-7)·박지 후기 첨부 배낭([CampSite.md](CampSite.md) CS-8)·배낭 공유 이미지([BagShare.md](BagShare.md)) 등 **제3자가 보는 표면에서는 렌더하지 않는다.** 이 원칙이 깨지면 2026-07-28에 우려한 재유입 경로가 그대로 열린다.
  - 앱 안에서는 **조회 단계에서 막는다** — 제3자가 여는 경로(`BagStore.getSharedBag`)는 사용자 문서를 읽으면서도 소유자용 정규화를 쓰지 않아 `imageUrl`이 애초에 실리지 않는다. 뷰에서 거르면 화면이 늘 때마다 빠뜨릴 수 있다.
  - ~~**`[미해결]` 앱 밖 표면**: 공유 링크(`{WEB_BASE_URL}/bag-share/{bagId}`)를 실제로 여는 웹 랜딩은 **별도 레포**(`lessismore`)이고 Firestore를 직접 읽는다. 이 앱의 조회 차단이 거기엔 적용되지 않으므로, **그쪽에서도 장비 `imageUrl`을 렌더하지 않는지 확인해야 비공개 원칙이 완성된다.** 2026-07-28 제거 작업의 잔여 항목으로도 남아 있었다.~~ **해소(2026-08-14)**: 웹 레포(`lessismore`)를 확인해 장비 `imageUrl`을 렌더하던 표면인 장비 공유 랜딩(`/gear-share/:id`)에서 렌더를 제거했다(웹 레포 커밋 4068e33 — `GearShareView`·`GearShare` 모델에서 제거, 앱 상세 문법 정합 + '앱으로 보기' 딥링크 추가와 함께). 이로써 앱 밖 웹 랜딩도 장비 `imageUrl`을 렌더하지 않아 비공개 원칙이 앱 안팎에서 완성됐다([GearDetail.md](GearDetail.md) GD-7 웹 랜딩 서술 참고).
- **표시 지점은 "본인이 보는 장비 행" 전부**다. 공용 행 컴포넌트(`GearView`)를 쓰는 화면이 자동으로 포함되므로 화면을 하나씩 열거하는 대신 규칙으로 정의한다 — 창고 목록([Warehouse.md](Warehouse.md) WH-1), 배낭 상세 장비 행([BagDetail.md](BagDetail.md) BD-1), 배낭 편집(BD-4)·패킹([Packing.md](Packing.md))·사용 기록(BD-5)의 장비 행, 검색·탐색의 **목록 행**([Search.md](Search.md) SR), 그리고 장비 상세([GearDetail.md](GearDetail.md) GD-1·GD-13).
  - **행과 카드를 구분한다.** 피드의 2컬럼 **카드**(FD-2)는 이미지 없는 텍스트 카드를 유지한다 — 무게가 카드의 시각 앵커인 구조라 썸네일이 들어가면 위계가 무너진다. 검색·탐색은 카드가 아니라 같은 `GearView` **행**을 쓰므로 썸네일이 나온다.
  - 검색 결과는 **보유 장비일 때만** 사진이 붙는다. 카탈로그 조회(Algolia)에는 이미지가 없고, 본인 창고에서 이미 읽어 온 값을 이어 붙이는 방식이라 추가 조회가 없다. 같은 장비가 창고에서는 사진이 있고 검색에서는 없는 불일치를 막기 위한 것이다.
- 업로드 UI는 장비 상세(GD-13)에만 둔다. Storage 경로는 DM-9.
- **소유권은 문서 경로가 아니라 Storage 경로로 판별한다.** `users/{uid}/gears/{id}.imageUrl`이 있다고 본인 사진인 것이 아니다 — 2026-07-28 이전 `GearStore.register()`가 카탈로그 문서를 통째로 복사해 사용자 문서에 저장했고, 그 페이로드에 **브랜드 크롤 이미지 URL이 함께 실렸다.** 카탈로그 이미지 42,369개 대 개인 업로드 819개라 사용자 문서에 남은 값은 오히려 크롤 URL이 다수다. 따라서 Firebase 다운로드 URL에 인코딩된 객체 경로가 **`{userId}/`로 시작할 때만** 본인 사진으로 인정한다(DM-9 경로표). 우리 버킷이 아닌 URL·`/o/` 세그먼트가 없는 URL·디코딩 실패·빈 값은 전부 "본인 것 아님"으로 떨어뜨린다. 이 판별은 **표시(읽기)와 Storage 파일 삭제가 같은 함수를 공유**한다(`model/gear-image/GearImageOwnership.ts`) — 읽기 쪽이 느슨하면 남의 저작물이 본인 사진인 척 표시되고, 삭제 쪽이 느슨하면 전 사용자 공용 크롤 자산을 지워 복구할 수 없다.
- **2024-12-08~2026-07-20에 올라온 기존 업로드(84명·819개 파일)는 삭제하지 않고 그대로 되살린다.** 폐기 기간에도 `users/{uid}/gears.imageUrl` 값을 지우지 않았고, **제거 코드가 사용자에게 배포된 적이 없어**(2026-07-29 확인 — `main` 미포함, 스토어 공개판 1.1.7/2026-07-06, OTA 최신 번들 커밋 2026-06-08) **실제 유실은 0건이다.** 읽기를 복원하면 그대로 다시 보인다.
- 단 이 안전은 "아직 배포 안 됨"에 기댄 것이라 영구적이지 않다. `develop`에는 제거 코드가 이미 들어가 있으므로, **이 개정이 릴리스보다 먼저 또는 함께 나가야 한다.** 릴리스 순서가 뒤집히면 그 시점부터 사용자가 장비를 수정할 때마다 사진이 지워진다(원인과 대응은 DM-11·[GearDetail.md](GearDetail.md) GD-13).
- **데이터 처리(운영)**:
  1. **카탈로그 `gear/{id}.imageUrl` 값은 보존한다(2026-07-28 사용자 결정)** — 향후 **브랜드 직접 제휴로 공식
     이미지를 제공할 가능성**에 대비해 데이터를 지우지 않는다. 앱이 필드를 읽지 않으므로 값이 남아 있어도
     화면에 노출되지 않는다. 일괄 제거가 필요해지는 경우를 위해 `scripts/clear-gear-imageurl.mjs`를
     보관한다(백업 우선, `--apply` opt-in, 비문자열 레거시 값 포함 — 실행은 사용자 확인 후에만).
  2. **개인 업로드(`/{userId}/**`)는 삭제하지 않는다** — 2026-07-29 개정으로 다시 쓰이는 데이터다.
     공유 갤러리 파일(`/gears/{gearId}/**`, 9개 폴더·11건)만 정리 대상으로 남긴다(갤러리는 폐기 유지).
     `/gears/` 직속의 크롤 이미지 42,369개는 위 ①에 따라 보존한다.
  3. `users/{uid}/gears.imageUrl` 잔존 값은 개정 후 **다시 읽는다**(정리 금지).
  4. 크롤 파이프라인(별도 레포)의 `imageUrl` 기록은 앱 동작과 무관하다 — 유지·중단은 제휴 계획과 함께
     별도 레포에서 결정.
- 브랜드 제휴로 공식 이미지를 제공하게 되면 **카탈로그 이미지 정책을 다시 개정**한다(표시 레이어 복원은 새 스펙 작업).
- **보안 규칙 점검 필요** `[운영]`: 2026-07-29 확인 시점에 Storage 루트가 **미인증 목록·메타데이터 조회를 허용**하고 있었다(앱 public config만으로 사용자별 폴더명=uid와 파일 목록을 전부 읽을 수 있었다). 업로드를 다시 여는 이상 **본인 경로만 읽기/쓰기 가능하도록 규칙을 좁혀야 한다** — 사용자 콘솔 작업이며 이 기능의 선행 조건으로 본다.
- **범위 밖**: 여행·박지 사진([BagShare.md](BagShare.md) 필름 카드, [CampSite.md](CampSite.md) 박지 대표 사진·`camp-spot.imageUrl`)은
  장비 이미지가 아니므로 이 원칙과 무관하다.

## 2. Firestore 컬렉션 맵 (DM-1)

| 경로 | 내용 | 주 사용처 |
| --- | --- | --- |
| `users/{uid}` | 사용자 문서 (약관 동의, 닉네임, 보유 배낭 ID) | `Firebase.ts` |
| `users/{uid}/gears/{gearId}` | 사용자 창고의 장비 | `GearStore` |
| `users/{uid}/bagTemplates/{templateId}` | 배낭 템플릿 — 날짜 없는 재사용 장비 구성 (DM-26) `[제안]` | 배낭 템플릿 ([BagTemplate.md](BagTemplate.md)) |
| `gear/{gearId}` | 전체 장비 카탈로그 (공용) | `GearStore`, Algolia 동기화 원본 |
| ~~`gear/{gearId}/images/{imageId}`~~ | **[폐기]** 장비 공유 이미지 갤러리 — 장비 이미지 미제공 원칙(§1). 기존 문서 정리는 §1 운영 절차 | — |
| `bag/{bagId}` | 배낭 (소유자 무관 단일 컬렉션) | `BagStore` |
| `gear-rank/{gearId}` | 장비 인기도 (보유 count) | `GearStore`(증감), `GearRankStore`(조회) |
| `brand-rank/{brandKey}` | 브랜드 인기도 집계 (보유수 합·제품수) | 탐색 브랜드 디렉토리 (Search SR-8) |
| `gear-comments/{gearId}` | 장비별 댓글 요약 문서 | `ReplyStore` |
| `gear-comments/{gearId}/comments/{commentId}` | 최상위 댓글 | `ReplyStore` |
| `gear-comments/{gearId}/comments/{parentId}/comments/{replyId}` | 답글 (중첩 서브컬렉션) | `ReplyStore` |
| `comment-likes/{userId}_{commentId}` | 댓글 좋아요 (복합 키 문서) | `ReplyStore` |
| `feed-content/{contentId}` | 운영자 작성 콘텐츠 — 홈 추천 큐레이션 (DM-27) `[기획]` | 홈 추천 박지·추천 장비 ([Home.md](Home.md) HM-11·HM-12) |
| `config/app` | 앱 원격 설정 (강제 업데이트 최소 버전) | 강제 업데이트 게이트 (AppLifecycle APP-7) |
| `config/announcement` | 인앱 텍스트 공지 (원격 배너) | 공지 시트 (Announcement AN) |
| `config/featurePopup` | 신기능 안내 팝업 (원격 온보딩) | 신기능 팝업 (FeaturePopup FP) |

## 3. 문서 스키마

### DM-2 `users/{uid}`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `termsAgreed` | boolean | 가입 시 false로 생성 |
| `privacyAgreed` | boolean | 가입 시 false로 생성 |
| `marketingAgreed` | boolean | 선택 항목, 가입 시 false로 생성 |
| `personalInfoAgreed` | boolean | 필수 항목, 가입 시점에는 필드 없음 |
| `over14Agreed` | boolean | 필수 항목, 가입 시점에는 필드 없음 |
| `smsAgreed` | boolean | 선택 항목, 가입 시점에는 필드 없음 |
| `agreedAt` | timestamp | 약관 동의 저장 시 기록 |
| `nickname` | string | 가입 시 `hiker{0~9999 난수}` 자동 생성 |
| `createdAt` | timestamp | 가입 일시 |
| `bags` | string[] | 보유 배낭 ID 배열 (`bag/{bagId}` 참조) |

약관 동의 완료 판정: `termsAgreed && privacyAgreed && personalInfoAgreed && over14Agreed` (필수 4종 모두 true).

### DM-3 장비 문서 (`users/{uid}/gears/{gearId}`, `gear/{gearId}` 공통 — `GearData`)

`model/store/GearStore.ts`의 `GearData` 인터페이스가 계약이다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | 문서 ID와 동일 |
| `name` | string | **캐논컬 값** — 정렬(`orderBy('name')`)·중복 키·편집 프리필용. 카탈로그는 영문 또는 빈 값 |
| `nameKorean` | string | 표시용 한글 이름. **표시는 항상 `Gear.getDisplayName()` (= `nameKorean \|\| name`)** |
| `company` | string | 제조사 (캐논컬) |
| `companyKorean` | string | 제조사 한글명 |
| `weight` | string \| number | **그램(g) 단위**. 인터페이스 선언은 string이지만 `Gear.getData()`는 number(`+this.weight`)로 저장 — 실제 문서에는 양쪽 타입이 혼재할 수 있다. 합산 시 `parseInt`/`Number` 변환 |
| `imageUrl` | string? | **문서 경로에 따라 의미가 다르다**(§1, 2026-07-29 개정). `users/{uid}/gears/{id}`: **사용자가 올린 본인 장비 사진**의 Storage 다운로드 URL — 읽고 쓴다(GD-13), 업로더 본인 화면에만 표시. `gear/{id}`(카탈로그): 크롤 이미지라 **읽지 않는다**(값은 보존). 사용자 문서에 값이 없으면 이미지 없음으로 취급하며, **카탈로그 값으로 폴백하지 않는다** |
| `color` | string | 자유 입력 문자열 (영문/원문) |
| `colorKorean` | string? | 색상 한글. **표시는 `colorKorean \|\| color`** (웹 크롤 파이프라인 기록, 옵셔널). `colorKorean`이 없어 원본값으로 떨어질 때는 **첫 글자만 대문자로 정규화해 표시한다** — 크롤 값이 `black`처럼 소문자 영문이라 그대로 노출하면 표시 품질이 떨어진다(2026-07-29 실측). 한글 매핑 확대는 미해결 |
| `size` | string? | 사이즈 (영문/원문, 옵셔널) |
| `sizeKorean` | string? | 사이즈 한글. **표시는 `sizeKorean \|\| size`** (옵셔널) |
| `category` | string | 카테고리 키 (아래 DM-4 — 세분 33키 또는 레거시 11키) |
| `groupId` | string? | 색상·사이즈 변형 그룹 id (크롤 기록). 앱은 표시·그룹핑에만 사용, 쓰지 않음 |
| `specs` | map? | **카테고리별 스펙 객체** (웹 `specs-schema.js`가 계약 — 예: 텐트 `capacity`/`waterproofRating`, 침낭 `fillPower`/`limitTemp`, 배낭 `volume`). 값은 number/string/boolean. 앱은 읽기 전용으로 상세에 표시(GD-8), 스키마 사본은 `model/gear/GearSpecsSchema.ts` |
| `isCustom` | boolean | true: 사용자 직접 등록, false: 카탈로그 출신 |
| `bags` | string[] | 이 장비가 담긴 배낭 ID 배열 |
| `used` | string[] | "사용함"으로 기록된 배낭 ID 배열 |
| `useless` | string[] | "사용 안 함"으로 기록된 배낭 ID 배열 |
| `createDate` | number | 생성 시각 (epoch ms) |
| `coupangUrl` | string | 옵셔널. 쿠팡 파트너스 최저가 구입 링크. 카탈로그 `gear/{id}`에만 두는 상품 속성 — 사용자 사본엔 복사 안 함 (GD-5). **실데이터 27건(0.1%)** |
| `productUrl` | string | 옵셔널. **브랜드 공식몰 상품 페이지 링크**(크롤 파이프라인 기록). `coupangUrl`과 같은 규칙 — 카탈로그에만 두고 사용자 사본엔 복사하지 않는다 (GD-5). **실데이터 37,576건(90.8%)** 으로 커버리지가 쿠팡보다 훨씬 넓다 |
| `productImageUrl` | string | 옵셔널. `productUrl` 페이지의 **`og:image` 절대 URL**(브랜드 CDN). 미리보기 카드(GD-5a) 전용이며 **이 필드만 렌더한다** — 같은 사진이라도 `imageUrl`을 대신 쓰면 안 된다(§1 경계). **백필로 미리 모으지 않는다** — 그 장비를 처음 연 네이티브 클라이언트가 og를 한 번 읽어 채운다(GD-5a). 웹은 CORS로 수집을 못 하지만 채워진 값은 그대로 읽는다 |

커버리지는 2026-08-08 전수 스캔(총 41,400건) 기준. **두 링크를 함께 가진 문서는 0건**이다 — `coupangUrl`이 붙은 27건은 크롤 이전에 수동 등록된 문서라 `productUrl`·`specs`·`groupId`가 아예 없다. 즉 GD-5의 두 행이 동시에 보이는 경우는 현재 데이터엔 없지만, 앞으로 생길 수 있으므로 구현은 두 행 모두를 다룬다.

미문서 상태로 남아 있는 크롤 필드(앱이 읽지 않음): `id`(문서 id와 중복 저장, 38,780건), `sourceUrl`·`secondaryCategory`(각 1건). 쓸 일이 생기면 그때 이 표에 올린다.

`/gear` 카탈로그는 정리되어 대부분 `nameKorean`=한글(표시값), `name`=영문/빈 값.
`/users/{uid}/gears`는 마이그레이션하지 않아 옛 형태(`name`=한글)일 수 있다 — `getDisplayName()` fallback으로 양쪽 모두 정상 표시.

### DM-4 카테고리 체계 (`GearFilter` 그룹 + 세분 카테고리)

카테고리는 **2단 체계**다. 웹 크롤 파이프라인(레포 `lessismore`의 `specs-schema.js`)이 `gear.category`에 **세분 카테고리 키(33개)** 를 직접 저장하고, 앱의 1차 필터 11개(`GearFilter`)는 세분 키들의 **그룹**으로 동작한다(2026-07 실데이터: 카탈로그 대부분이 이미 세분 키).

**1차 그룹 (`GearFilter`, `model/gear/GearFilter.ts`)** — 필터 칩·차트·통계 단위. `all`은 필터 전용.

**그룹 → 세분 카테고리 매핑 (`model/gear/GearCategoryGroups.ts`)** — 레거시 그룹 키 자신도 멤버로 포함(구 데이터 호환):

| 그룹 | 세분 카테고리 (키) |
| --- | --- |
| `tent` 텐트 | `tent` 텐트 / `tarp` 타프 / `shelter` 쉘터 / `tent_acc` 텐트ACC |
| `sleeping_bag` 침낭 | `sleeping_bag` 침낭 |
| `mat` 매트 | `mat` 매트 / `pillow` 필로우 |
| `backpack` 배낭 | `backpack` 배낭 / `vest_pack` 베스트 배낭 / `backpack_cover` 배낭 커버 / `pouch` 파우치·수납가방 |
| `clothing` 의류 | `clothing` 일반 / `gloves` 장갑 / `gaiter` 스패츠 / `sunglasses` 선글라스 |
| `furniture` 가구 | `chair` 체어 / `table` 테이블 / `furniture_etc` 그 외 기타 |
| `lantern` 랜턴 | `lighting` 조명 / `headlamp` 헤드랜턴 |
| `cooking` 조리 | `cookware` 코펠·쿡웨어 / `stove` 버너 / `torch` 토치 / `cup` 컵 / `bowl` 그릇 / `cutlery` 수저 / `bottle` 물통 / `cookware_etc` 식기류 기타 |
| `electronic` 전자기기 | `electronic` 전자기기 |
| `food` 음식 | `food` 식품 |
| `etc` 기타 | `etc` 기타 / `towel` 수건 / `hand_warmer` 핫팩 / `shovel` 삽 / `hammer` 망치 / `microspikes` 아이젠 / `trekking_pole` 트레킹폴 |

- **`headlamp`는 2026-08-09에 추가했다.** 그 전에는 랜턴과 헤드랜턴이 `lighting` 하나에 섞여 있었다 — 실데이터 221건 중 98건이 헤드랜턴이라 절반 가까이가 잘못 묶여 있던 셈이다. 기존 문서 이관은 `scripts/migrate-headlamp-category.mjs`(백업 우선, `--apply` opt-in)로 하고, 판정은 이름의 `헤드+램프/랜턴/라이트`에 **모델명 규칙**을 더한다 — 나이트코어 NU·HC 시리즈와 블랙다이아몬드 코스모는 이름에 '헤드'가 없지만 전 모델이 헤드랜턴이다(BD 랜턴 라인은 모지·올빗·아폴로라 겹치지 않는다).
  - 같은 개정에서 **세분 카테고리 `lantern`을 없앴다** — 카탈로그 실데이터 0건이고, 랜턴 그룹은 이제 `조명`·`헤드랜턴` 둘로만 나뉜다. 다만 **그룹 멤버 배열에는 `lantern`을 남긴다**: 커스텀 장비 등록(`CustomGearCategory`)이 아직 이 키를 저장하고 그 문서는 `users/{uid}/gears`에 있어 셀 수 없다. 멤버에서 빼면 그 장비들이 랜턴 필터에서 빠져 `etc`로 떨어진다. 세분 라벨만 지우면 화면은 그룹 라벨(`랜턴`)로 폴백하므로 표시는 그대로다.
  - **사용자 창고 사본도 함께 옮긴다.** 카탈로그만 고치면 같은 장비가 카탈로그에서는 `헤드랜턴`, 내 창고에서는 `랜턴`으로 보인다. 실측 결과 사용자 문서(총 3,279건)에는 `lighting`이 0건이고 **`lantern`이 268건**이었다 — 카탈로그 0건만 보고 판단하면 안 된다. `scripts/migrate-headlamp-user-gears.mjs`로 268건을 `headlamp` 66 / `lighting` 202로 갈랐다. 판정 규칙은 카탈로그 이관과 **같은 모듈**(`scripts/lib/HeadlampRule.mjs`)을 쓴다 — 두 곳이 갈리면 불일치가 다시 생긴다.
  - 사용자 등록 장비는 표기가 제각각(`Black Diamond 스프린트 225`, `크레모아 헤디플러스`)이라 이름 규칙만으로는 샌다. 모델명 규칙에 영문 브랜드명과 축약 표기를 함께 넣은 이유다.
  - **`[미해결]` 크롤 파이프라인**: 새로 들어오는 상품의 `category`는 별도 레포(`lessismore`)의 `specs-schema.js`가 정한다. **거기에도 `headlamp`를 추가하지 않으면 신규 헤드랜턴이 계속 `lighting`으로 쌓인다.**
**2026-08-09 개정 — 레거시 세분 키 정리.** 그룹 키와 이름이 같아 "큰 분류인지 세부 분류인지" 구분이 안 되던 `furniture`·`lantern`·`cooking`을 **세분 카테고리에서 뺐다**. `clothing`은 값을 유지하되 세분 라벨을 **`일반`** 으로 바꿔 같은 문제를 해소했다(22,889건이라 이동 비용이 크고, 그룹 라벨 `의류`와 세분 라벨 `일반`이 겹치지 않으면 그것으로 충분하다).

- **세 키 모두 그룹 멤버 배열에는 남긴다.** 커스텀 장비 등록(`CustomGearCategory`)이 아직 이 키들을 저장하므로, 멤버에서 빼면 그 장비가 필터에서 빠져 `etc`로 떨어진다. 세분 라벨만 지우면 화면은 그룹 라벨로 폴백하므로 표시는 그대로다.
  - **`[함정]` 멤버 배열을 세분 칩에 그대로 넘기지 말 것.** 라벨 없는 레거시 키가 섞여 있어 **글자 없는 빈 칩**이 생긴다(실제로 조리 필터에 빈 칩이 났다). 칩은 `getSelectableFineCategories()`로 라벨 있는 것만 추려서 낸다 — 조회용 `where('category','in', ...)`는 레거시 키가 필요하므로 계속 `getGroupMembers()`를 쓴다. **조회와 표시의 목록이 다르다**는 점이 이 구조의 핵심이다.
- **새 세분 키**: `cookware` 코펠·쿡웨어, `furniture_etc` 그 외 기타. 특히 조리 그룹에는 **코펠 자리가 없어서** 쿡셋·쿠커·포트가 갈 곳 없이 `cooking`에 남아 있었다(카탈로그 475건 중 174건).
- **기존 문서 이관**은 `scripts/migrate-legacy-categories.mjs`(백업 우선, `--apply` opt-in). 카탈로그 475건 + 사용자 창고 838건 = **1,313건**을 규칙(`scripts/lib/CategorySplitRules.mjs`)으로 갈랐다. 카탈로그와 사용자 문서가 **같은 규칙**을 쓴다 — 갈리면 같은 장비가 두 곳에서 다르게 보인다.
- **`[함정]` 한글 뒤에 `\b`를 쓰지 말 것.** `\b`는 ASCII 단어문자 기준이라 `컵\b`가 `싱글컵 320ml`을 못 잡는다(한글도 공백도 비단어라 경계가 서지 않는다). 이 실수로 컵·팬·볼이 전부 `식기류 기타`로 떨어졌었다 — 규칙 수정 시 재발 주의.

- 그룹 필터의 Firestore 쿼리는 `where('category','in', 그룹 멤버 배열)` — 최대 멤버 9개(cooking)로 Firestore `in` 30개 제한 안. 매핑에 없는 미지의 키는 `etc` 그룹으로 폴백.
- 세분 카테고리 한글 라벨은 웹 `CATEGORY_LABELS`와 동일하게 유지한다(위 표). 상세 화면 메타 라인은 세분 라벨을 표시.
- 사용자 직접 등록(`CustomGearCategory`)은 기존 11개 그룹 키를 그대로 저장한다(세분 선택 UI 없음).

### DM-5 `bag/{bagId}`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `name` | string | 배낭 이름 |
| `weight` | number | 총 무게(g). 담긴 장비 weight 합 (BD-스펙 참조) |
| `gears` | string[] | 담긴 장비 ID 배열 (`users/{uid}/gears` 참조) |
| `startDate` | string | ISO 8601 문자열. 생성·복사가 항상 `toISOString()`으로 쓰지만, **레거시 문서에는 없을 수 있다** — 배낭 목록의 **날짜 정렬**에서 방향과 무관하게 뒤로 보낸다([Bag.md](Bag.md) BAG-6, DM-25) |
| `endDate` | string | ISO 8601 문자열 |
| `editDate` | string | ISO 8601 문자열, 수정 시 갱신 |
| `createdAt` | string | ISO 8601 문자열, **생성 시 1회만** 쓰고 이후 갱신하지 않는다. 배낭 목록의 `최근 추가순` 정렬 기준([Bag.md](Bag.md) BAG-6). **옵셔널** — 2026-07-31 이전에 만든 문서엔 없다. 없으면 `editDate`로 대체한다(수정한 적 없는 배낭은 두 값이 같고, 수정한 배낭은 실제 생성보다 뒤로 잡힌다) |
| `shared` | boolean | 링크 공유 여부 (배낭 공유 BD-7). 후기 첨부 공개와는 별개 |
| `reviewShared` | boolean | 박지 후기에 첨부돼 공개된 배낭 여부 ([CampSite.md](CampSite.md) CS-8, DM-20). `shared`와 독립 플래그. 옵셔널(기존 문서엔 없음) |
| `memo` | string | 옵셔널 |
| `userId` | string | 소유자 uid (공유 조회 시 장비 경로 해석에 사용) |
| `packedGears` | string[] | 패킹 모드에서 챙긴 장비 ID 배열 ([Packing.md](Packing.md) PK-4). 옵셔널(기존 문서엔 없음) |
| `packingStartedAt` | string | 최초 패킹 시작 시각(ISO 8601). 옵셔널 |
| `packingCompletedAt` | string | 패킹 완료 시각(ISO 8601). 옵셔널 — 완료 해제·리셋 시 필드 제거 |
| `location` | object | 배낭 여행지의 단일 원본. `BagLocation` 형태(DM-15). 옵셔널(미설정 시 없음) |
| `weather` | object | `location` 좌표에서 조회한 여행 기간 날씨 스냅샷 캐시. `WeatherSnapshot` 형태(DM-15). 옵셔널 |

패킹 필드는 여행 후에도 보존한다(히스토리 데이터, [Packing.md](Packing.md) §8). 배낭 복사 시에는 복사하지 않는다([Bag.md](Bag.md) BAG-4).

배낭 복사 시 `location`/`weather`는 복사하지 않는다. 여행지 좌표 변경 시에는 새 `location` 저장과 기존 `weather` 제거를 **한 번의 `updateDoc`**으로 처리하고, 새 조회 성공 후 `weather`를 별도 저장한다. 좌표가 같고 표시명·박지 참조만 바뀌면 기존 일별 날씨는 유지하되 `weather.locationName`을 새 이름으로 함께 갱신한다. 상세 동작은 [BagDestination.md](BagDestination.md) DST-6, 날씨 캐시는 [Weather.md](Weather.md) WT-5.

### DM-6 `gear-rank/{gearId}`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | 장비 ID |
| `count` | number | 보유 사용자 수. `increment(±1)`로 관리 |
| `category` | string | `GearFilter` 값 |
| `updatedAt` | timestamp | 마지막 증감 시각 |

**불변 규칙**: 카탈로그 장비(`isCustom === false`)만 집계한다. 추가 시 +1(없으면 count=1 생성), 제거 시 -1(count ≤ 1이면 문서 삭제).

### DM-7 댓글 (`gear-comments`)

요약 문서 `gear-comments/{gearId}`: `gearId`, `totalCount`, `parentCount`, `lastCommentAt`, `createdAt`, `updatedAt`, 그리고 **별점 집계**(장비 리뷰 별점, [Reply.md](Reply.md) RP-1) `ratingSum`, `ratingCount`, `ratingAvg`.
댓글 카운트와 별점 집계는 댓글 생성/수정/삭제 트랜잭션 안에서 함께 갱신된다.

- `ratingCount` = **별점이 있는 최상위 댓글 수**(답글·레거시 무별점 댓글 제외). `ratingSum` = 그 별점들의 합. `ratingAvg` = `ratingCount>0 ? ratingSum/ratingCount : 0`(소수 1자리). `increment`로 못 구하는 `ratingAvg`는 트랜잭션 내 재계산.

댓글 문서 (`comments/{commentId}`, 답글도 동일 형태 — `model/reply/Comment.ts`):

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | |
| `content` | string | 논리 삭제 시 `'[삭제된 댓글입니다]'` |
| `authorId` / `authorName` | string | 작성자 uid / 닉네임 |
| `authorProfileUrl` | string? | |
| `parentId` | string \| null | 최상위는 null |
| `depth` | number | 0: 최상위, 1: 답글 (스토어 검증: `depth > 2`면 예외) |
| `rating` | number? | 최상위 리뷰 별점 1~5(RP-1). 답글·레거시 댓글에는 없음. 별점 집계는 이 값이 있는 최상위 댓글만 포함 |
| `isDeleted` | boolean | 답글 있는 댓글은 논리 삭제 |
| `likeCount` / `replyCount` | number | 트랜잭션으로 증감 |
| `createdAt` / `updatedAt` / `deletedAt?` | timestamp | |
| `mentionedUserName` / `mentionedUserId` | string? | 답글 @멘션 |

좋아요: `comment-likes/{userId}_{commentId}` = `{ userId, commentId, gearId, createdAt }`. 존재 여부가 좋아요 상태.

### DM-8 `gear/{gearId}/images/{imageId}` `[폐기]`

**장비 이미지 미제공 원칙(§1, 2026-07-28)에 따라 폐기.** 공유 이미지 갤러리(GearDetail GD-4)가 제거되어
더 이상 읽거나 쓰지 않는다. 기존 문서·Storage 파일 정리는 §1 운영 절차를 따른다.
폐기 전 필드: `id` · `url` · `uploadedBy` · `uploadedAt` · `uploaderName`.

### DM-13 `config/app` `[제안]`

앱 원격 설정 단일 문서. 강제 업데이트 게이트(AppLifecycle APP-7)가 앱 시작 시 1회 읽는다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `iosMinVersion` | string? | iOS 최소 지원 버전(semver). 현재 앱 버전이 이보다 낮으면 게이트 표시. 없으면 iOS 게이트 없음 |
| `androidMinVersion` | string? | Android 최소 지원 버전(semver). 없으면 Android 게이트 없음 |

- **읽기**: 로그인 이전에도 조회하므로 미인증 공개 읽기를 허용해야 한다(`gear`/`gear-rank`와 동일 정책). 보안 규칙에 `config/app` 읽기 허용 추가 필요 — **사용자 콘솔/규칙 배포 작업**.
- **쓰기**: Firebase 콘솔에서 수동으로만. 클라이언트는 쓰지 않는다.
- 버전은 app.json `version`(단일 버전 소스)과 같은 체계의 `major.minor.patch` 문자열로 넣는다(예: `1.1.7`).

### DM-14 `brand-rank/{brandKey}`

브랜드 인기도 집계 문서. 탐색 브랜드 디렉토리(Search SR-8)가 `ownerCount desc`로 조회한다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `brandKey` | string | 문서 ID. 정규화된 브랜드 키 (아래 규칙) |
| `companyKorean` | string | 표시용 한글 브랜드명 |
| `company` | string | 영문 브랜드명 (없을 수 있음) |
| `ownerCount` | number | 이 브랜드 소속 장비들의 `gear-rank.count` **합** = 사용자 보유수 합계 (= 인기순 정렬 키). **실시간 증감 대상** |
| `gearCount` | number? | 이 브랜드의 카탈로그 제품 수(`gear` 기준). **백필 시에만 계산**하며 실시간 증감하지 않는다(카탈로그 변경 시 재백필). 표시용 보조 필드 |
| `updatedAt` | timestamp | 마지막 갱신 시각 |

- **brandKey 정규화**: `companyKorean`(없으면 `company`)를 trim + 소문자화한 값. 표시는 항상 `companyKorean || company`. 둘 다 없으면 집계에서 제외.
- **유지 방식**: `GearStore.register`/`remove`의 gear-rank 증감 트랜잭션에서 해당 장비의 `brand-rank/{brandKey}`도 `ownerCount`를 `increment(±1)`한다(카탈로그 장비 `isCustom === false`만, gear-rank와 동일 조건). 문서 없으면 생성(`ownerCount=1`, `gearCount`는 백필이 채움), `ownerCount ≤ 1`에서 -1이면 삭제(gear-rank 규칙과 대칭). `gearCount`는 실시간 갱신하지 않는다.
- **초기 백필**: 기존 데이터는 스크립트 1회로 `gear-rank` × `gear`(company)를 조인·브랜드별 합산해 생성한다. 앱 Firestore 쓰기이므로 **클라이언트 SDK + public config**로 작성(admin 키 불필요, `gear-rank`처럼 미인증 쓰기 허용 경로). 변경 전 백업 JSON 저장([DM-12](#7-운영-스크립트-dm-12) 관례).
- **읽기 규칙**: 브랜드 디렉토리는 로그인 사용자 화면이나, `gear-rank`와 동일하게 공개 읽기 허용을 둔다(보안 규칙 작업).

### DM-15 배낭 여행지·날씨 캐시 (`bag.location`, `bag.weather`)

`bag` 문서 안에 중첩 저장되는 여행지 단일 원본과 그 좌표에서 조회한 날씨 캐시. 여행지 상세 동작은 [BagDestination.md](BagDestination.md), 날씨 조회·신선도는 [Weather.md](Weather.md).

**`BagLocation`** (`bag.location`)

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `name` | string | 표시용 지명/주소. 자유 위치는 Kakao 지오코딩 결과 또는 검색 장소명, 박지 연결은 선택 당시 `camp-spot.name` 스냅샷 |
| `latitude` | number | WGS84 위도 |
| `longitude` | number | WGS84 경도 |
| `campSpotId` | string? | 연결된 등록 박지(`/camp-spot/{campSpotId}`, DM-17) 참조. 박지 선택 시에만 존재하며 자유 위치로 변경하면 제거한다. 이름·좌표는 참조와 별도로 항상 저장해 박지 삭제·비활성·조회 실패에도 여행지를 유지한다. 기존 문서에 이 필드가 없으면 자유 위치로 간주한다. |

**`WeatherSnapshot`** (`bag.weather`) — 캐시 신선도 판단 메타를 함께 보관

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `fetchedAt` | string | ISO 8601. TTL 판단용 |
| `kind` | string | `forecast`(예보) / `archive`(실측) / `normal`(평년값) / `mixed`(구간 혼합) |
| `frozen` | boolean | 여행 종료일이 오늘 이전이면 true → 재조회 안 함 |
| `latitude` | number | 스냅샷 당시 좌표(위치 변경 감지용) |
| `longitude` | number | 스냅샷 당시 좌표 |
| `locationName` | string | 스냅샷 당시 지명 |
| `daily` | array | 하루치 배열(`WeatherDaily`) |

**`WeatherDaily`** (`weather.daily[]`)

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `date` | string | `YYYY-MM-DD` |
| `code` | number | WMO weather_code (한글/아이콘 매핑은 `model/weather/WeatherCode.ts`) |
| `tempMax` | number | 최고기온(℃) |
| `tempMin` | number | 최저기온(℃) |
| `source` | string | `forecast` / `archive` / `normal` (일별 데이터 출처 구분 — UI 배지는 미표시) |
| `precipProb` | number? | 강수확률(%). 예보 구간 |
| `precipSum` | number? | 강수량(mm). 실측/평년 구간 |
| `windSpeedMax` | number? | 최대 풍속(m/s) |
| `windGustMax` | number? | 최대 돌풍(m/s) |

### DM-16 트래킹 기록 (`bag.track`) `[폐기]`

필드샷(여행 사진 공유 이미지) 기능이 기획 단계에서 폐기되어 미구현·미사용 (2026-07-11). 번호는 재사용하지 않는다.

### DM-17 박지 (`camp-spot/{spotId}`) `[기획]`

박지 지도([CampSite.md](CampSite.md))의 박지 카탈로그. 관리 스크립트(`scripts/seed-camp-spots.mjs`)로만 적재하고 클라이언트는 읽기 전용.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `name` | string | 박지명 |
| `type` | string | `campground`(야영장) / `shelter`(대피소) / `wild`(노지) — `CampSiteType` enum |
| `location` | map | `{ latitude: number, longitude: number }` (WGS84) |
| `region` | string | 시/도 단위 지역명 (예: `강원`). **좌표 기준**이 진실 — Kakao `coord2regioncode`의 `region_1depth_name`을 축약 표기로 정규화한다(`강원특별자치도`→`강원`, `전남광주통합특별시`→`전남광주`). 큐레이션 원본의 값과 다르면 좌표를 따른다 |
| `city` | string? | 시/군/구 단위 지역명 (예: `평창군`, `보령시`, `옹진군`). Kakao `coord2regioncode`의 `region_2depth_name`. 표시는 `region + city`를 합쳐 `강원 평창군`처럼 낸다(`getCampSpotRegionLabel`). 옛 문서엔 없을 수 있어 옵셔널이며, 없으면 `region`만 표시한다 |
| `description` | string | 자체 작성 설명 |
| `facilities` | string[] | `toilet` / `water` / `deck` / `store` 중 해당 항목 |
| `accessInfo` | string? | 접근 정보 자유 텍스트 (예: `주차장에서 도보 40분`) |
| `tags` | string[]? | 지형·특징 태그 — `mountain`(산)/`beach`(해변)/`valley`(계곡)/`island`(섬)/`lake`(호수)/`plain`(초원·평원)/`forest`(숲), `CampSiteTag` enum. 다중 부여 가능. 큐레이션 spot 위주로 부여하며 없으면 태그 필터에서 제외됨 |
| `warnings` | string? | 주의·규제 문구 (있으면 상세 상단 경고 박스) |
| `imageUrl` | string? | 대표 사진 URL |
| `source` | string | `gocamping` / `knps` / `curated` — 출처 표기용 |
| `sourceKey` | string? | 시드 멱등성 키(source별 원본 키 — curated=slug, gocamping=contentId). 문서 id는 무작위 고유값이라 재실행 매칭에 이 필드를 쓴다 |
| `status` | string | `active` / `hidden` — 클라이언트는 `active`만 조회 |
| `updatedAt` | string | ISO 8601 — 적재/갱신 시각 |

문서 id는 **무작위 고유값(Firebase 자동 생성)**이다. 재실행 멱등성은 `(source, sourceKey)` 매칭으로 보장한다(`scripts/seed-camp-spots.mjs`). 구형 `{source}:{key}` id는 `scripts/rekey-camp-spots.mjs`로 재키했다(콜론이 공유 URL 링크화에서 끊기고 slug가 노출되는 문제). 보안 규칙: 읽기 공개, 쓰기 금지(시드 시에만 임시 허용).

### DM-18 박지 후기 캐시 (`camp-spot-review/{spotId}`) `[기획]`

박지 상세([CampSite.md](CampSite.md) CS-3) 후기(네이버 블로그·유튜브) 검색 결과의 **공유 캐시**. 외부 검색 API를 상세 진입마다 호출하지 않도록 결과를 저장해 두고, **7일이 지난 캐시는 상세 진입 시 클라이언트가 재조회해 갱신**한다(read-through, 주 1회 최신화).

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `reviews` | array | `CampSiteReview[]` — `{ title, summary, bloggerName, postDate, link }` |
| `videos` | array | `CampSiteVideo[]` — `{ videoId, title, channelName, thumbnailUrl }` |
| `updatedAt` | string | ISO 8601 — 마지막 최신화 시각 (TTL 판정 기준) |
| `queryVersion` | number? | 결과를 만든 **검색·필터 규칙 버전**. 없으면 레거시(버전 1 이전, `0`으로 취급) |

- 문서 id = `camp-spot/{spotId}`의 spotId. 갱신은 문서 통째 덮어쓰기(setDoc).
- **두 소스 모두 조회에 성공했을 때만 저장**한다(0건 포함). 한쪽이라도 실패(키 미설정·HTTP 오류)하면 저장하지 않아 기존 캐시가 오염되지 않고, 다음 진입에서 재시도된다.
- 갱신 실패 시 기존(만료된) 캐시를 그대로 표시한다 — 후기는 정확도보다 가용성 우선.
- **캐시의 `queryVersion`이 앱의 현재 버전보다 낮으면**(없으면 `0`) TTL과 무관하게 만료로 보고 재조회한다. 이때 기존 캐시는 **표시하지 않는다** — 위의 "가용성 우선"은 같은 규칙으로 담긴 값이 낡은 경우에만 적용되고, 규칙이 바뀌어 이미 부적합으로 판정된 결과는 노출 대상이 아니다. 검색어·관련성 필터 규칙을 바꿀 때마다 코드의 상수를 올려 캐시를 자연 무효화한다(일괄 삭제 스크립트 불필요).
- **더 높은 버전의 캐시는 그대로 쓴다**(같지 않다고 만료로 보지 않는다). 공유 캐시를 여러 앱 버전이 함께 쓰므로, `불일치 = 만료`로 판정하면 신·구 버전이 서로의 결과를 무효화하며 왕복 재조회를 일으켜 유튜브 쿼터를 태운다. 구버전 앱은 신버전이 담은(더 엄격한 규칙의) 결과를 그대로 표시하는 편이 안전하다.
- 보안 규칙: 읽기·쓰기 공개(캐시 특성상 클라이언트가 직접 갱신, 2026-07-12 실측 확인).

### DM-19 장비 외부 후기 캐시 (`gear-review/{gearId}`) `[기획]`

장비 상세([GearDetail.md](GearDetail.md) GD-6) 외부 후기(네이버 블로그·유튜브)의 공유 캐시. **필드·TTL(7일)·갱신 정책은 DM-18과 동일**하며 컬렉션과 문서 id(gearId)만 다르다. 공용 모듈(`model/review/`)이 두 캐시를 함께 다룬다.

### DM-20 박지 유저 후기 (`camp-spot-user-review/{spotId}` + `/reviews/{userId}`) `[기획]`

박지 상세([CampSite.md](CampSite.md) CS-8)의 **유저 작성 후기**(별점·글·다녀온 배낭). DM-18(외부 블로그·유튜브 캐시)과 별개의 유저 생성 콘텐츠다. 요약 문서 + 후기 서브컬렉션 구조(장비 댓글 `gear-comments` DM-7 패턴 재사용)로, 별점 집계를 요약 문서에 트랜잭션으로 유지한다.

**요약 문서 `camp-spot-user-review/{spotId}`**

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `spotId` | string | `camp-spot/{spotId}` |
| `reviewCount` | number | 후기 수 |
| `ratingSum` | number | 별점 합(평균 산출용) |
| `ratingAvg` | number | 평균 별점(소수 1자리, `ratingSum/reviewCount`) |
| `updatedAt` | string | ISO 8601 |

**후기 문서 `camp-spot-user-review/{spotId}/reviews/{userId}`** — 문서 id = 작성자 uid라 **박지당 유저 1개**가 구조적으로 보장된다(재작성=덮어쓰기).

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `authorId` | string | 작성자 uid (== 문서 id) |
| `authorName` | string | 작성 시점 닉네임 스냅샷(`Firebase.getNickname()`) |
| `rating` | number | 1~5 정수(필수) |
| `content` | string? | 후기 글(선택, 최대 1000자) |
| `bagId` | string? | 다녀온 배낭 id(선택) — 첨부 시 해당 `bag.reviewShared=true`로 설정(링크 공유 `shared`와 별개) |
| `bagName` | string? | 첨부 배낭 이름 스냅샷 |
| `bagDate` | string? | 첨부 배낭 날짜 스냅샷("YYYY.MM.DD" 또는 범위) |
| `bagWeight` | string? | 첨부 배낭 무게 스냅샷(kg) |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601 |

- 작성/수정/삭제는 **`runTransaction`**으로 후기 문서 + 요약 문서를 함께 갱신한다(DM-11). 신규=요약 `reviewCount+1`·`ratingSum+rating`, 수정=`ratingSum`에 별점 차이 반영, 삭제=`reviewCount-1`·`ratingSum-rating`(0건이면 요약 문서 삭제). `ratingAvg`는 매 갱신 시 재계산.
- 첨부 배낭 정보는 **스냅샷 비정규화**(원본 배낭 변경·삭제에 견고). 배낭 열람은 `bagId`로 앱 내 읽기전용 뷰어(CS-8 `/shared-bag/{bagId}`)에서 `bag.reviewShared` 또는 `bag.shared`가 `true`인 배낭을 로드한다(`BagStore.getSharedBag`가 두 플래그를 함께 허용).
- **후기용 공개는 `reviewShared` 전용 플래그**로 링크 공유(`shared`)와 분리한다. 같은 배낭이 여러 박지 후기에 첨부될 수 있어(유저당 박지별 1개지만 박지가 다르면 별개) **후기 삭제 시 `reviewShared`를 되돌리지 않는다**(레퍼런스 카운트 없이 안전). 남아 있어도 링크 공유 노출과 무관하고 참조하는 후기가 없으면 발견되지 않는다.
- 보안 규칙(콘솔 관리): 읽기 공개, 후기 문서 쓰기는 **인증 유저이고 문서 id == `request.auth.uid`**일 때만(작성자 위조 방지). 요약 문서는 클라이언트 트랜잭션 갱신 허용. 클라이언트 SDK에서도 `authorId==uid` 재검증.

### DM-21 박지 즐겨찾기 (`users/{uid}/camp-favorites/{spotId}`) `[기획]`

박지 즐겨찾기([CampSite.md](CampSite.md) CS-9). 사용자 하위 컬렉션(`users/{uid}/gears` 패턴)이며 문서 id = 박지 id라 토글이 멱등이다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `name` | string | 즐겨찾기 시점 박지명 스냅샷(박지 삭제 후에도 표시용) |
| `createdAt` | string(ISO) | 등록 시각 |

- 토글 on = `setDoc`, off = `deleteDoc`. 목록은 로그인 사용자의 지도 진입 시 1회 `getDocs`.
- 박지 문서(`/camp-spot`) 변경·삭제를 자동 반영하지 않는다 — 필터 시 활성 박지와 조인해 자연히 걸러진다(CS-9).
- 탈퇴 시 사용자 문서 트리와 함께 삭제 대상(AU-8 정책 따름).

### DM-22 배낭 운동 기록 (`bag.activity`) `[기획]`

배낭 여행의 실측 운동 기록([HealthActivity.md](HealthActivity.md) HA-5). **건강 데이터 원본은 저장하지 않는다** — 기기의 건강 허브(HealthKit / Health Connect)에 있는 운동을 가리키는 **참조와 표시용 요약값만** 둔다.

`bag` 문서 안의 옵셔널 객체이며, 연결된 기록이 없으면 필드 자체가 없다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `workoutIds` | string[] | 건강 허브의 운동 식별자(iOS: HKWorkout UUID / Android: Health Connect record id). 1박 2일이 날짜별로 나뉜 경우를 위해 복수 |
| `platform` | string | `healthkit` / `healthconnect` — 식별자 체계가 달라 어느 소스에서 연결했는지 구분 |
| `distance` | number | 총 이동 거리(m). 표시용 스냅샷 |
| `duration` | number | 총 소요 시간(초) |
| `elevationGain` | number? | 누적 상승고도(m). 소스에 없으면 생략 |
| `activeEnergy` | number? | 소모 활동 에너지(kcal) |
| `linkedAt` | string(ISO) | 연결 시각 |

- **요약값을 스냅샷으로 두는 이유**: 기기 교체·권한 회수·건강 허브 데이터 삭제 후에도 배낭 목록·타일 부제에 요약을 계속 보여주기 위함이다. 상세(경로·심박·페이스)는 매번 기기에서 다시 읽으므로, 읽을 수 없으면 상세만 비고 요약은 남는다(HA-5).
- **거리·시간 외 시계열(심박 배열, 경로 좌표)은 절대 저장하지 않는다.** 건강 데이터의 서버 보관은 심사·프라이버시 부담이 크고 이 기능에 불필요하다.
- `workoutIds`는 **기기 로컬 식별자**라 다른 기기에서는 해석되지 않는다. 플랫폼을 바꾼 사용자(iOS→Android)는 재연결이 필요하다.
- 탈퇴 시 배낭 문서와 함께 삭제된다(AU-8 정책 따름).

### DM-23 인앱 공지 배너 (`config/announcement`) `[기획]`

인앱 배너 원격 제어 단일 문서([Announcement.md](Announcement.md)). 앱이 `onSnapshot`으로 실시간 구독한다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | 공지 식별자. 닫음 상태의 단위(AN-4) — 값이 바뀌면 새 공지로 보고 다시 띄운다 |
| `active` | boolean | 표시 여부. `false`면 배너 없음 |
| `message` | string | 배너 텍스트(필수). 빈 값이면 배너 없음 |
| `link` | string? | 탭 시 이동. 앱 내부 경로(`/bag` 등) 또는 `http(s)://` URL. 없으면 탭 이동 없음 |
| `startAt` | string?(ISO) | 노출 시작. 없으면 시작 제한 없음 |
| `endAt` | string?(ISO) | 노출 종료. 없으면 종료 제한 없음 |

- **읽기**: 로그인 이전에도 조회하므로 미인증 공개 읽기를 허용한다(`config/app`과 동일 정책). 보안 규칙에 `config/announcement` 읽기 허용 추가 필요 — **사용자 콘솔/규칙 배포 작업**.
- **쓰기**: Firebase 콘솔에서 수동으로만. 클라이언트는 쓰지 않는다.
- 닫음 상태(닫은 `id`)는 서버에 저장하지 않고 기기 로컬(AsyncStorage)에만 둔다.

### DM-24 신기능 안내 팝업 (`config/featurePopup`) `[기획]`

신기능 온보딩 팝업 원격 제어 단일 문서([FeaturePopup.md](FeaturePopup.md)). 앱이 `onSnapshot`으로 실시간 구독한다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | 팝업 식별자. 닫음 단위(FP-5) — 값이 바뀌면 새 팝업으로 보고 다시 띄운다 |
| `active` | boolean | 표시 여부. `false`면 팝업 없음 |
| `title` | string | 제목(필수). 빈 값이면 팝업 없음 |
| `subtitle` | string? | 부제목. 없으면 표시 안 함 |
| `items` | array? | 아이템 목록. **앞에서 최대 3개**만 렌더(FP-3). 각 원소는 아래 형태 |
| `items[].imageUrl` | string? | 썸네일 원격 이미지. 없거나 로드 실패면 빈 박스 |
| `items[].title` | string | 아이템 제목(필수). 없으면 그 아이템 스킵 |
| `items[].description` | string? | 아이템 설명 |
| `items[].link` | string? | 탭 시 이동. 앱 내부 경로(`/bag` 등) 또는 `http(s)://`. 없으면 탭 비활성 |
| `buttonLabel` | string? | 메인 버튼 라벨. 없으면 기본값 `확인` |
| `buttonLink` | string? | 메인 버튼 이동 대상(내부 경로/`http(s)`). 없으면 닫기만 |
| `showSkip` | boolean? | 건너뛰기 노출 여부. 기본(미지정)은 노출, `false`면 숨김. `forced=true`면 무시 |
| `forced` | boolean? | 강제(차단) 모드(FP-7). `true`면 닫기 불가·닫음 저장 안 함·아이템 탭 비활성·버튼은 이동만(`buttonLink` 없으면 숨김). 기본(미지정) 일반 모드 |
| `startAt` | string?(ISO) | 노출 시작. 없으면 시작 제한 없음 |
| `endAt` | string?(ISO) | 노출 종료. 없으면 종료 제한 없음 |

- **읽기**: 로그인 이전에도 조회하므로 미인증 공개 읽기를 허용한다(`config/app`과 동일 정책). 보안 규칙에 `config/featurePopup` 읽기 허용 추가 필요 — **사용자 콘솔/규칙 배포 작업**.
- **쓰기**: Firebase 콘솔에서 수동으로만. 클라이언트는 쓰지 않는다.
- 닫음 상태(닫은 `id` 목록)는 서버에 저장하지 않고 기기 로컬(AsyncStorage)에만 둔다.

### DM-26 배낭 템플릿 (`users/{uid}/bagTemplates/{templateId}`) `[제안]`

배낭 템플릿([BagTemplate.md](BagTemplate.md)) — **날짜 없는 재사용 장비 구성**. 배낭 저장(BT-1 — 배낭 목록 카드 `⋯` 메뉴·배낭 상세 `⋯` 메뉴 두 진입점)으로만 생성되고, 템플릿 상세(BT-4)에서 수정되며, 템플릿에서 배낭 생성(BT-3)의 원본이 된다. `users/{uid}/gears`와 같은 **소유자 전용 서브컬렉션 패턴**이며 공유 경로가 없다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `name` | string | 템플릿 이름 |
| `gears` | string[] | 장비 ID 배열 (`users/{uid}/gears` 참조 — 카탈로그 `/gear` 아님) |
| `weight` | number | 저장 시점 합계 무게(g) 캐시 |
| `createdAt` | string | 생성 시각 ISO 8601 |
| `editDate` | string | 마지막 수정 시각 ISO 8601 |

- **템플릿은 `gear.bags[]` ↔ `bag.gears[]` 양방향 불변식(DM-11) 대상이 아니다.** 템플릿 저장·수정·삭제와 장비 삭제 어느 쪽도 상대를 갱신하지 않는다 — 장비 삭제 후 템플릿에 남는 stale ID는 템플릿에서 배낭을 만드는 시점([BagTemplate.md](BagTemplate.md) BT-3)에 걸러진다(존재하는 장비만 담고 `weight` 재계산).
- **수정 경로는 템플릿 상세(BT-4)의 두 가지뿐이며, 어느 쪽이든 템플릿 문서 하나만 갱신한다**:
  - **이름 수정**: `name` + `editDate`(수정 시점 ISO).
  - **장비 편집 확정**: `gears`(담긴 장비 ID) + `weight`(담긴 장비 `weight` 합으로 재계산 — 캐시 갱신) + `editDate`. 장비 문서의 `bags`는 건드리지 않는다(위 불변식 항목). 문서가 1개라 트랜잭션·배치가 필요 없다.
- **BT-3 생성은 템플릿의 `gears`를 중복 제거(Set)한 뒤 사용한다** — 배열에 같은 ID가 중복으로 남아 있어도 새 배낭의 `gears`에 한 번만 담기고, 같은 장비 문서에 배치 update가 중복으로 걸리거나 `weight`가 이중 합산되지 않는다(방어 처리 — BT-1 저장은 배낭의 `gears`를 그대로 복사하므로 원본에 중복이 있으면 템플릿에도 남는다).
- `weight`는 저장·수정 시점 캐시라 이후 장비 무게 수정을 따라가지 않는다 — BT-3 생성 시 재계산되므로 목록·상세 표시용으로만 쓴다. BT-4 장비 편집 확정 시에도 재계산돼 캐시가 갱신된다.
- **보안 규칙 확인 필요**: 규칙 파일이 이 레포에 없어(콘솔 관리) `users/{uid}/bagTemplates` 읽기/쓰기 허용 여부를 구현 전에 확인해야 한다 — [BagTemplate.md](BagTemplate.md) §8 미해결 질문.

### DM-27 운영자 콘텐츠 (`feed-content/{contentId}`) `[기획]`

**홈 추천 큐레이션**([Home.md](Home.md) HM-11 추천 박지 · HM-12 추천 장비)의 운영자 작성 콘텐츠 — 운영자가 매번 선정해 발행하는 박지 소개(`spot_intro`)·장비 소개(`gear_intro`)로, 홈 추천 2섹션의 유일한 소스다(2026-08-15 확정 — 카탈로그 최신순 자동 노출은 폐기). **요약 카드가 전부다**(A안 확정 2026-08-15) — 글 전문(`body`)·인앱 뷰어가 없고, 카드 탭은 관련 박지·장비 상세로 직행한다. 목록 정렬 기준은 **`publishedAt` 내림차순**이다. 앱은 읽기 전용이며, 작성·발행 도구는 **별도 레포(lessismore 웹)의 AdminView를 CMS로 확장**해 만든다 — 운영 도구는 웹 레포 몫이고, 이 레포는 스키마 계약과 읽기 경로만 다룬다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `type` | string | `spot_intro`(박지 소개 → HM-11 추천 박지) / `gear_intro`(장비 소개 → HM-12 추천 장비) — string enum `FeedContentType`. `article`(독립 글)은 이번 범위 제외(HM-13 `[폐기]` 이력 — 전문 뷰어가 필요해 도입 시 후속 기획) |
| `title` | string | 제목 |
| `summary` | string | 운영자 요약 (홈 카드에 표시 — 콘텐츠의 전부. 추천 박지 카드는 본문으로, 추천 장비 카드는 하단 캡션 옵션으로) |
| `relatedSpotId` | string? | `type == 'spot_intro'`면 **필수** — `camp-spot/{spotId}`(DM-17) 참조. 카드 탭의 도착지(지도 탭 박지 상세) |
| `relatedGearId` | string? | `type == 'gear_intro'`면 **필수** — `gear/{gearId}`(DM-3) 참조. 카드 탭의 도착지(장비 상세) |
| `publishedAt` | string | ISO 8601 — 발행 시각. 목록 정렬 기준(내림차순) |
| `published` | boolean | 발행 여부. **클라이언트는 `true`만 조회**한다 — `false`는 CMS의 초안 |

- 앱 조회는 `where('published', '==', true)` + `orderBy('publishedAt', 'desc')` + `limit(30)`으로 전체 발행 콘텐츠를 받아, 클라이언트에서 `type`별로 분리하고 `spot_intro` 3개·`gear_intro` 10개로 제한한다([Home.md](Home.md) HM-14, 2026-08-15 확정). 등호 조건과 정렬만 사용해 복합 색인을 요구하지 않는다.
- `relatedSpotId`/`relatedGearId`는 유형별로 하나만 존재한다(`spot_intro`는 `relatedSpotId`, `gear_intro`는 `relatedGearId` — 각자 자기 유형에서 **필수**, 다른 유형에는 없음). **참조만 저장**한다(이름 스냅샷 없음) — 카드의 대상 정보(박지 이름·유형·지역, 장비 셀)는 앱이 참조를 따라가 조회하고, 발행 시 유효 참조 보장은 CMS(웹 몫) 책임이며, 대상 부재(hidden·삭제) 처리는 각 진입 경로의 기존 규칙을 따른다(HM-11·HM-12).
- **보안 규칙(콘솔 관리)**: **읽기 공개 확정**(2026-08-15 사용자 확정 — 비로그인 홈 노출의 전제, HM-14) + **쓰기는 admin(운영자) 전용**. 규칙 파일이 이 레포에 없어 실제 규칙 배포·구성 확인은 미해결이고, 클라이언트 SDK에는 admin 개념이 없어(웹 CMS의 쓰기 인증 방식 포함) **구현 전에 확인해야 한다** — §8 미해결 질문.

## 4. Storage 경로 (DM-9)

| 경로 패턴 | 용도 | 상태 |
| --- | --- | --- |
| `/{userId}/{fileName}` | **개인 장비 이미지** (장비 상세에서 업로드, [GearDetail.md](GearDetail.md) GD-13) | **사용** (2026-07-29 개정) |
| `/gears/{fileName}` | 크롤 파이프라인이 적재한 카탈로그 이미지 | 보존, 앱은 읽지 않음 (§1) |
| `/gears/{gearId}/{imageId}` | 장비 공유 이미지 갤러리 | **폐기** (DM-8, 재도입 안 함) |

- 업로드는 **본인 경로(`/{userId}/`)에만** 쓴다. 파일명은 충돌하지 않게 생성하고, 업로드 후 받은 다운로드 URL을 `users/{uid}/gears/{id}.imageUrl`에 저장한다(DM-3).
- 이미지를 **교체·삭제할 때 이전 Storage 파일도 함께 지운다** — 참조가 끊긴 파일이 쌓이면 용량만 늘고 회수 경로가 없다(현재 819개 중 상당수가 이미 그런 상태일 수 있다).
- **삭제는 본인 경로(`/{userId}/`)의 파일만 대상으로 한다.** 사용자 문서의 `imageUrl`이 크롤 이미지(`/gears/{fileName}`)를 가리킬 수 있으므로(§1 소유권 판별), 소유 경로가 아니면 아무것도 하지 않고 성공으로 돌아간다. 크롤 자산은 전 사용자 공용이라 오삭제 시 복구 경로가 없다.
- 보안 규칙은 §1의 `[운영]` 항목 참고 — 본인 경로만 읽기/쓰기로 좁혀야 한다.

## 5. Algolia (DM-10)

| 항목 | 값 |
| --- | --- |
| App ID | `BWS6CWRXRM` |
| 인덱스 | `useless-gear-search` |
| API 키 | 클라이언트 코드에 포함된 search-only 공개 키 (`model/search/SearchStore.ts`) |
| 페이지 크기 | `hitsPerPage: 100` |
| 동기화 | Firestore `/gear` 쓰기 → Firebase 익스텐션이 자동 동기화 |
| 검색 속성 | `searchableAttributes`에 `nameKorean` 포함 — `name`이 비어도 한글 검색 동작 (인덱스 설정은 Algolia 대시보드 관리라 코드로는 검증 불가, CLAUDE.md 기록 기준) |

검색 hit에서 사용하는 필드: `objectID`, `name`, `nameKorean`, `company`, `companyKorean`, `weight`, `color`, `category`.
(`imageUrl`은 장비 이미지 미제공 원칙(§1)으로 hit에서 더 이상 읽지 않는다 — 인덱스에 남아 있어도 무시.)
hit → `Gear` 변환 시 `useless: []`, `used: []`, `bags: []`, `createDate: Date.now()`를 로컬에서 채운다.

인기 검색어: Algolia Analytics API (`/2/searches?index=useless-gear-search&limit=10&orderBy=searchCount&direction=desc`).

## 6. 일관성 규칙 (DM-11)

여러 문서를 함께 바꾸는 연산은 반드시 트랜잭션/배치를 쓴다. 현재 사용처:

| 연산 | 방식 | 함께 갱신되는 문서 |
| --- | --- | --- |
| 배낭 장비 저장 `BagStore.save` | `runTransaction` | `bag/{id}`(gears, weight) + 추가 장비의 `bags` + 제거 장비의 `bags`/`used`/`useless` |
| 배낭에 장비 1개 추가 `BagStore.addGear` | `runTransaction` | `bag/{id}` + 장비 문서 |
| 배낭 삭제 `BagStore.delete` | 배치 | 장비들의 `bags`/`used`/`useless` 정리 + `bag/{id}` 삭제 + `users/{uid}.bags`에서 제거 |
| 배낭 복사 `BagStore.copy` | `writeBatch` | 새 `bag` 문서 생성 + 담긴 장비들의 `bags`에 새 ID 추가 + `users/{uid}.bags`에 추가 ([Bag.md](Bag.md) BAG-4) |
| 장비 등록 `GearStore.register` | `writeBatch` | `users/{uid}/gears` + `gear-rank` 증가 |
| 장비 삭제 `GearStore.remove` | `writeBatch` | 장비 문서 삭제 + 소속 배낭들의 `gears`/`weight` 갱신 + `gear-rank` 감소 |
| 장비 무게 수정 | `GearStore.update` 후 `BagStore.updateBagsWeight` 배치 | 소속 배낭들의 `weight` |
| 댓글 생성/수정/삭제/좋아요 | `runTransaction` | 댓글 문서 + 요약 문서(카운트 + 별점 집계 `ratingSum`/`ratingCount`/`ratingAvg`) + 부모 `replyCount` / `likeCount` (별점 수정은 요약 델타 반영 위해 updateComment도 트랜잭션) |
| 박지 유저 후기 생성/수정/삭제 | `runTransaction` | 후기 문서 + 요약 문서(`reviewCount`/`ratingSum`/`ratingAvg`) (DM-20) |
| 회원 탈퇴 `Firebase.deleteUserData` | 청크 `writeBatch` | `gear-rank` 감소 + `bag` 문서들 + `users/{uid}/gears` 전체 + `comment-likes` + `users/{uid}` 삭제 ([Auth.md](Auth.md) AU-8) |

**양방향 참조 불변식**: `gear.bags[]` ↔ `bag.gears[]`는 항상 쌍으로 갱신되어야 한다. `bag.weight`는 담긴 장비 `weight` 합과 일치해야 한다.

**문서 갱신은 모르는 필드를 지우지 않는다**: 장비 수정(`GearStore.update`)은 `Gear.getData()`가 만든 페이로드로 문서를 쓰는데, **전체 덮어쓰기(`setDoc` 무옵션)를 쓰면 페이로드에 없는 필드가 전부 사라진다.** 실제로 이 경로로 `imageUrl`이 유실될 뻔했다(§1). 크롤 파이프라인이 넣는 `specs`·`groupId`·`colorKorean`·`sizeKorean`처럼 앱이 모델에 담지 않는 필드도 같은 위험에 있다. **부분 갱신(`setDoc(..., { merge: true })` 또는 `updateDoc`)을 쓴다** — 모델이 아는 필드만 갱신하고 나머지는 건드리지 않는다.

### DM-25 `in` 쿼리 30개 상한

ID 배열로 문서를 모아 읽는 경로는 모두 Firestore `in` 절의 **값 30개 상한**에 걸린다. 상한 초과는 네트워크 오류가 아니라 **쿼리 생성 시점의 클라이언트 검증 예외**라, 해당 문서에서는 매번 결정적으로 실패한다.

- 이런 경로는 `IN_QUERY_CHUNK_SIZE`(30) 단위로 **청크 분할해 병렬 조회한 뒤 병합**한다. 현재 대상: 배낭 목록 `users/{uid}.bags` → `bag`([Bag.md](Bag.md) BAG-1, [GearDetail.md](GearDetail.md) GD-10), 배낭 장비 `bag.gears` → `users/{userId}/gears`([BagDetail.md](BagDetail.md) BD-1).
- **`orderBy`는 청크별로만 걸리므로 청크 분할 경로에서는 서버 정렬에 의존하지 않는다.** 병합 뒤 클라이언트에서 정렬하고, 기준은 Firestore와 결과가 같도록 둔다 — **문자열 필드는 코드포인트 순**(`localeCompare` 아님), 날짜·숫자는 값 비교(ISO 8601 날짜는 epoch 변환 비교가 문자열 비교와 동치라 어느 쪽이든 무방).
  - 동률 항목은 **문서 ID 오름차순**으로 타이브레이크한다 — Firestore가 `orderBy` 동률에서 `__name__` 오름차순을 주므로, 그래야 청크 분할 전후 순서가 같다.
  - **정렬 필드가 없는 문서에 주의한다.** Firestore `orderBy(F)`는 `F`가 없는 문서를 결과에서 **제외**하지만, 클라이언트 정렬은 포함한다 — 청크 분할을 도입하면 이전에 안 보이던 문서가 나타날 수 있다. 각 경로에서 이 문서들을 어디에 둘지 스펙에 명시한다(현재 두 경로 모두 **뒤로**).

## 7. 운영 스크립트 (DM-12)

- Firestore 일괄 변경은 admin 키가 없어 **클라이언트 SDK + public config**로 작성한다 (`scripts/migrate-name-korean.mjs`, `scripts/swap-namekorean.mjs`, `scripts/migrate-gear-rank.ts` 참고).
- `/gear`·`/gear-rank`는 보안 규칙상 미인증 쓰기가 허용된다. **변경 전 반드시 백업 JSON을 먼저 저장**한다 (`scripts/backup-*.json` 관례).
- Hot Updater OTA 백엔드는 별도 프로젝트 `useless-ota` — 그 admin 키로는 앱 Firestore에 쓸 수 없다.

## 8. 미해결 질문

- 탈퇴 시 댓글(`gear-comments`)·박지 유저 후기(`camp-spot-user-review` DM-20)는 남는다 — 완전 삭제 정책은 [Auth.md](Auth.md) AU-8 미해결 질문 참조.
- **`feed-content`(DM-27) 보안 규칙 배포 확인** — 읽기 공개는 **확정**(2026-08-15 사용자 확정)이나, 규칙은 콘솔 관리라 실제 배포된 규칙이 그와 일치하는지 이 레포에서 확인 불가. 쓰기 admin(운영자) 전용 구성과 웹 CMS(AdminView)가 어떤 인증으로 쓰기를 할지(admin SDK 경유 서버·특정 uid 허용 등)를 구현 전 확인 필요 — [Home.md](Home.md) HM-11·HM-12.
- ~~**`camp-spot`(DM-17) 등록 시각 필드 부재** — 홈 새로운 박지 섹션의 "최근 등록순"에 쓸 필드가 없다(`updatedAt`은 재시드마다 갱신). `createdAt` 추가·백필 여부 미확정.~~ — **자동 소스 폐기로 해소(2026-08-15)**: 홈 섹션이 운영자 추천(`feed-content`, [Home.md](Home.md) HM-11)으로 전환돼 정렬은 `publishedAt`이 담당한다. `camp-spot`에 등록 시각 필드를 더할 이유가 없어졌다.
- ~~`bag` 목록 조회(`where('__name__', 'in', bagIds)`)는 Firestore `in` 절 30개 제한의 영향권~~ → DM-25로 규칙화(청크 분할). 배낭 목록은 [Bag.md](Bag.md) BAG-1, 장비 상세의 함께한 여행 타임라인은 [GearDetail.md](GearDetail.md) GD-10, 배낭 장비는 [BagDetail.md](BagDetail.md) BD-1에서 해소.
