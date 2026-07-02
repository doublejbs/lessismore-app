# 데이터 모델 (Firestore / Storage / Algolia)

| 항목 | 내용 |
| --- | --- |
| 상태 | as-built (2026-06-10 코드 기준) |
| ID 프리픽스 | `DM` |
| 주요 코드 | `model/store/*.ts`, `model/firebase/Firebase.ts`, `model/firebase/FirebaseImageStorage.ts`, `model/gear/Gear.ts`, `model/bag/BagItem.ts`, `model/reply/Comment.ts` |
| 관련 스펙 | 모든 도메인 스펙이 이 문서를 참조한다 |

## 1. 개요

앱 데이터는 Firebase 프로젝트 **`lessismore-7e070`** 의 Firestore / Storage / Auth 에 저장되고,
장비 카탈로그 검색은 **Algolia** 인덱스가 담당한다. 이 문서가 모든 컬렉션 경로·필드의 단일 정의처다.
다른 스펙에서는 경로 이름만 적고 필드 정의는 이 문서를 링크한다.

## 2. Firestore 컬렉션 맵 (DM-1)

| 경로 | 내용 | 주 사용처 |
| --- | --- | --- |
| `users/{uid}` | 사용자 문서 (약관 동의, 닉네임, 보유 배낭 ID) | `Firebase.ts` |
| `users/{uid}/gears/{gearId}` | 사용자 창고의 장비 | `GearStore` |
| `gear/{gearId}` | 전체 장비 카탈로그 (공용) | `GearStore`, Algolia 동기화 원본 |
| `gear/{gearId}/images/{imageId}` | 장비 공유 이미지 갤러리 | `GearImageStore` |
| `bag/{bagId}` | 배낭 (소유자 무관 단일 컬렉션) | `BagStore` |
| `gear-rank/{gearId}` | 장비 인기도 (보유 count) | `GearStore`(증감), `GearRankStore`(조회) |
| `gear-comments/{gearId}` | 장비별 댓글 요약 문서 | `ReplyStore` |
| `gear-comments/{gearId}/comments/{commentId}` | 최상위 댓글 | `ReplyStore` |
| `gear-comments/{gearId}/comments/{parentId}/comments/{replyId}` | 답글 (중첩 서브컬렉션) | `ReplyStore` |
| `comment-likes/{userId}_{commentId}` | 댓글 좋아요 (복합 키 문서) | `ReplyStore` |

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
| `imageUrl` | string | 이미지 URL. `'http'` 포함 여부로 유효성 판단, 없으면 `''` |
| `color` | string | 자유 입력 문자열 |
| `category` | string | `GearFilter` enum 값 (아래 DM-4) |
| `isCustom` | boolean | true: 사용자 직접 등록, false: 카탈로그 출신 |
| `bags` | string[] | 이 장비가 담긴 배낭 ID 배열 |
| `used` | string[] | "사용함"으로 기록된 배낭 ID 배열 |
| `useless` | string[] | "사용 안 함"으로 기록된 배낭 ID 배열 |
| `createDate` | number | 생성 시각 (epoch ms) |

`/gear` 카탈로그는 정리되어 대부분 `nameKorean`=한글(표시값), `name`=영문/빈 값.
`/users/{uid}/gears`는 마이그레이션하지 않아 옛 형태(`name`=한글)일 수 있다 — `getDisplayName()` fallback으로 양쪽 모두 정상 표시.

### DM-4 카테고리 enum (`GearFilter`)

`model/gear/GearFilter.ts` — string enum. 저장 값은 영문 슬러그, 표시명은 `FilterManager`/`CustomGearCategory`가 정의.

`all`(전체) / `tent`(텐트) / `sleeping_bag`(침낭) / `backpack`(배낭) / `clothing`(의류) / `mat`(매트) / `furniture`(가구) / `lantern`(랜턴) / `cooking`(조리) / `electronic`(전자기기) / `food`(음식) / `etc`(기타)

`all`은 필터 전용 값으로 장비 문서에는 저장되지 않는다.

### DM-5 `bag/{bagId}`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `name` | string | 배낭 이름 |
| `weight` | number | 총 무게(g). 담긴 장비 weight 합 (BD-스펙 참조) |
| `gears` | string[] | 담긴 장비 ID 배열 (`users/{uid}/gears` 참조) |
| `startDate` | string | ISO 8601 문자열 |
| `endDate` | string | ISO 8601 문자열 |
| `editDate` | string | ISO 8601 문자열, 수정 시 갱신 |
| `shared` | boolean | 링크 공유 여부 |
| `memo` | string | 옵셔널 |
| `userId` | string | 소유자 uid (공유 조회 시 장비 경로 해석에 사용) |

### DM-6 `gear-rank/{gearId}`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | 장비 ID |
| `count` | number | 보유 사용자 수. `increment(±1)`로 관리 |
| `category` | string | `GearFilter` 값 |
| `updatedAt` | timestamp | 마지막 증감 시각 |

**불변 규칙**: 카탈로그 장비(`isCustom === false`)만 집계한다. 추가 시 +1(없으면 count=1 생성), 제거 시 -1(count ≤ 1이면 문서 삭제).

### DM-7 댓글 (`gear-comments`)

요약 문서 `gear-comments/{gearId}`: `gearId`, `totalCount`, `parentCount`, `lastCommentAt`, `createdAt`, `updatedAt`.
댓글 카운트는 댓글 생성/삭제 트랜잭션 안에서 함께 갱신된다.

댓글 문서 (`comments/{commentId}`, 답글도 동일 형태 — `model/reply/Comment.ts`):

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | |
| `content` | string | 논리 삭제 시 `'[삭제된 댓글입니다]'` |
| `authorId` / `authorName` | string | 작성자 uid / 닉네임 |
| `authorProfileUrl` | string? | |
| `parentId` | string \| null | 최상위는 null |
| `depth` | number | 0: 최상위, 1: 답글 (스토어 검증: `depth > 2`면 예외) |
| `isDeleted` | boolean | 답글 있는 댓글은 논리 삭제 |
| `likeCount` / `replyCount` | number | 트랜잭션으로 증감 |
| `createdAt` / `updatedAt` / `deletedAt?` | timestamp | |
| `mentionedUserName` / `mentionedUserId` | string? | 답글 @멘션 |

좋아요: `comment-likes/{userId}_{commentId}` = `{ userId, commentId, gearId, createdAt }`. 존재 여부가 좋아요 상태.

### DM-8 `gear/{gearId}/images/{imageId}`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `id` | string | |
| `url` | string | Storage 다운로드 URL |
| `uploadedBy` | string | 업로더 uid (본인만 삭제 가능) |
| `uploadedAt` | number/timestamp | 최신순 정렬 키 |
| `uploaderName` | string? | 업로더 닉네임 |

## 4. Storage 경로 (DM-9)

`model/firebase/FirebaseImageStorage.ts`:

| 경로 패턴 | 용도 |
| --- | --- |
| `/{userId}/{fileName}` | 개인 장비 이미지 (장비 추가/편집 업로드) |
| `/gears/{fileName}` | 공용 업로드 |
| `/gears/{gearId}/{imageId}` | 장비 공유 이미지 갤러리 (삭제 API 존재) |

파일명: 업로드 파일명은 **UUID**(`generateUUID()` = `Date.now().toString(36)` + 난수, `model/gear/FileUpload.ts`).
(`CustomGear.getFileName()`의 이름 기반 규칙은 호출처가 없는 데드 코드다.)

## 5. Algolia (DM-10)

| 항목 | 값 |
| --- | --- |
| App ID | `BWS6CWRXRM` |
| 인덱스 | `useless-gear-search` |
| API 키 | 클라이언트 코드에 포함된 search-only 공개 키 (`model/search/SearchStore.ts`) |
| 페이지 크기 | `hitsPerPage: 100` |
| 동기화 | Firestore `/gear` 쓰기 → Firebase 익스텐션이 자동 동기화 |
| 검색 속성 | `searchableAttributes`에 `nameKorean` 포함 — `name`이 비어도 한글 검색 동작 (인덱스 설정은 Algolia 대시보드 관리라 코드로는 검증 불가, CLAUDE.md 기록 기준) |

검색 hit에서 사용하는 필드: `objectID`, `name`, `nameKorean`, `company`, `companyKorean`, `weight`, `imageUrl`, `color`, `category`.
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
| 댓글 생성/수정/삭제/좋아요 | `runTransaction` | 댓글 문서 + 요약 문서(카운트) + 부모 `replyCount` / `likeCount` |
| 회원 탈퇴 `Firebase.deleteUserData` | 청크 `writeBatch` | `gear-rank` 감소 + `bag` 문서들 + `users/{uid}/gears` 전체 + `comment-likes` + `users/{uid}` 삭제 ([Auth.md](Auth.md) AU-8) |

**양방향 참조 불변식**: `gear.bags[]` ↔ `bag.gears[]`는 항상 쌍으로 갱신되어야 한다. `bag.weight`는 담긴 장비 `weight` 합과 일치해야 한다.

## 7. 운영 스크립트 (DM-12)

- Firestore 일괄 변경은 admin 키가 없어 **클라이언트 SDK + public config**로 작성한다 (`scripts/migrate-name-korean.mjs`, `scripts/swap-namekorean.mjs`, `scripts/migrate-gear-rank.ts` 참고).
- `/gear`·`/gear-rank`는 보안 규칙상 미인증 쓰기가 허용된다. **변경 전 반드시 백업 JSON을 먼저 저장**한다 (`scripts/backup-*.json` 관례).
- Hot Updater OTA 백엔드는 별도 프로젝트 `useless-ota` — 그 admin 키로는 앱 Firestore에 쓸 수 없다.

## 8. 미해결 질문

- 탈퇴 시 댓글(`gear-comments`)은 남는다 — 완전 삭제 정책은 [Auth.md](Auth.md) AU-8 미해결 질문 참조.
- `bag` 목록 조회(`where('__name__', 'in', bagIds)`)는 Firestore `in` 절 30개 제한의 영향권 — 배낭이 30개를 넘는 사용자 처리 미정.
