# Firebase 계약 (커뮤니티 · 그룹 · 배낭 코스)

이 디렉터리는 DM-28(커뮤니티)·DM-29(그룹)·DM-30(배낭 코스)의 Firestore·Storage 보안 규칙과 복합 인덱스 문서다. 앱에서 자동 배포하지 않으며, **콘솔 배포 전 사용자 확인 필요** 사항이다.

## 배포 대상 파일

| 파일 | 대상 | 근거 스펙 |
| --- | --- | --- |
| `community-firestore.rules` | 커뮤니티 4개 컬렉션 | DM-28, Community.md |
| `community-storage.rules` | `/community/**` | DM-9, CM-6 |
| `community-firestore.indexes.json` | 커뮤니티 복합 인덱스 7 + fieldOverrides 3 | DM-28 |
| `group-firestore.rules` | `groups/**`, `users/{uid}/groups/**` | DM-29, Group.md GRP-3·4·5·8·9·12 |
| `group-storage.rules` | `/groups/{groupId}/routes/*.gpx` | DM-9, GRP-8 |
| `group-firestore.indexes.json` | (비어 있음 — 아래 그룹 절 참고) | DM-29 인덱스 |
| `bag-firestore.rules` | `bag/{bagId}/routes/**` | DM-30, BagDetail.md BD-11 |
| `bag-storage.rules` | `/bags/{bagId}/routes/*.gpx` | DM-9, DM-30, BD-11 |

**어떤 파일도 단독으로 배포하지 않는다.** 실제 배포는 `deployed/` 병합본 기준이며, 인덱스 배포는 파일에 없는 인덱스를 **삭제**하려 하므로 특히 병합본만 쓴다.

2026-09-18 기준 `deployed/firestore.rules`·`deployed/storage.rules`에 **배낭 코스 병합까지 끝나 있다**(아래 "배낭 코스" 절). 2026-09-17 기준 같은 파일에 **그룹 병합이 끝나 있다**(아래 "그룹 규칙 병합 시 주의"·"병합 기록" 참고). 원본 3종은 계약의 정본이고 병합본은 그 사본이다 — **한쪽만 고치지 않는다.**

## 커뮤니티

## 배포 전 확인

1. 규칙의 운영자 예외와 좋아요·댓글·투표 카운트 검증 범위를 실제 운영 방식과 대조한다. 투표는 계정당 결정적 문서 한 개를 유지하며, 다른 선택지로 변경할 때 이전 선택지 `-1`·새 선택지 `+1`과 `optionId` 갱신이 같은 트랜잭션에서 일어나고 `totalVoteCount`는 유지되는지 확인한다.
2. `community-firestore.rules`의 내용을 Firebase 콘솔 Firestore Rules 편집기에 붙여 넣고 시뮬레이터로 비로그인 읽기, 본인 쓰기, 타인 쓰기를 확인한다.
3. Rules 시뮬레이터에서 존재하지 않는 좋아요·투표·신고 문서의 본인 ID 기반 `get`이 허용되는지, 타인 ID는 거부되는지 확인한다.
4. Rules 시뮬레이터에서 `comments.status in ['published', 'deleted']` 쿼리와 본문 수정·작성자 soft-delete(자리표시) 경로를 각각 확인한다.
5. `community-storage.rules`의 내용을 Storage Rules 편집기에 붙여 넣고 공개 읽기, 본인 JPEG 업로드·삭제, 타인 경로 및 목록 조회 차단을 확인한다.
6. CLI를 사용할 때는 프로젝트 설정 파일에서 이 규칙 파일을 명시한 뒤 `firebase deploy --only firestore:rules,storage`를 실행한다. 실행 전 프로젝트와 대상 파일을 확인한다.
7. 인덱스 쿼리에서 Firebase가 생성한 콘솔 링크를 아래에 기록한다.
8. 규칙이 새 필드를 요구하는 경우에는 반드시 **마이그레이션 실행 → 대상 0건 확인 → 규칙 배포** 순서를 지킨다. 규칙을 먼저 배포하면 기존 문서의 필드 결손으로 작성자 수정·투표가 거부될 수 있다.

투표 규칙 에뮬레이터 확인 시 첫 투표와 같은 선택지 재투표(변경 없음), 다른 선택지 변경(카운터 이동), `totalVoteCount` 변조, 타인 문서 변경, 삭제, 마감 후 변경을 각각 확인한다. 결과는 배포 전 검토 보고서에 남기며 규칙은 이 저장소에서 자동 배포하지 않는다.

탈퇴·삭제 연쇄 정리 Functions는 `lessismore` 레포 `functions/`(README 참조)가 담당한다. 클라이언트는 커뮤니티 문서를 추가로 삭제하지 않는다.

## 인덱스 생성 콘솔 링크

- 게시글 전체 피드(최신순): (콘솔 링크 기록)
- 게시글 패킹 필터(최신순, `status` + `hasBagSnapshot` + `createdAt`): (콘솔 링크 기록)
- 게시글 투표 필터(최신순, `status` + `hasPoll` + `createdAt`): (콘솔 링크 기록)
- 게시글 전체 피드(인기순, `status` + `likeCount` + `createdAt`): (콘솔 링크 기록)
- 게시글 패킹 필터(인기순, `status` + `hasBagSnapshot` + `likeCount` + `createdAt`): (콘솔 링크 기록)
- 게시글 투표 필터(인기순, `status` + `hasPoll` + `likeCount` + `createdAt`): (콘솔 링크 기록)
- 내가 쓴 글(`authorId` + `status` + `createdAt`): (콘솔 링크 기록)
- 댓글 상태·생성 시각: (콘솔 링크 기록)
- 신고 상태·생성 시각: (콘솔 링크 기록)

댓글 쿼리는 `status in ['published', 'deleted']`와 `createdAt asc`를 사용하므로 `status` 오름차순·`createdAt` 오름차순 복합 인덱스로 기록했다. 커뮤니티 피드는 전체 최신순 1개, 전체 인기순 1개, `hasBagSnapshot`·`hasPoll` 불리언 유형 필터별 최신순·인기순 4개, 내가 쓴 글 1개로 `community-posts` 복합 인덱스 7개를 사용한다. 컬렉션 그룹 단일 필드(`authorId`, `status`, `mentionedUserId`)는 `community-firestore.indexes.json`의 `fieldOverrides`로 배포 범위를 활성화하며, 앱 쿼리에 사용하는 복합 인덱스 7개와 함께 이 파일만 배포 기준으로 삼는다. 실제 Firebase CLI가 요구하는 형식과 프로젝트 콘솔 결과가 다르면 배포 전에 이 문서를 먼저 갱신한다.

각 컬렉션 그룹 `fieldOverrides`에는 기본 컬렉션 단일 필드 인덱스(오름차순·내림차순·array-contains)를 유지하면서 컬렉션 그룹 오름차순 범위를 추가했다. 신고 `(status, createdAt)` 복합 인덱스는 앱·서버 쿼리가 아닌 Firebase 콘솔에서 신고를 상태·시각순으로 훑기 위한 운영용 인덱스로 유지한다.

## 배포 기록 (2026-09-03)

`deployed/`에 **실제 프로덕션에 배포된 파일**을 그대로 둔다(`firebase deploy --only firestore,storage`, 프로젝트 `lessismore-7e070`).

- `deployed/firestore.rules` = `community-firestore.rules` + 기존 프로덕션 규칙 병합. **배포 전 프로덕션 규칙은 전면 개방(`allow read, write: if true`)이었다**(`deployed/backup-2026-09-03-*.rules`). 기존 컬렉션의 동작을 바꾸지 않기 위해 와일드카드 규칙을 유지하되, 커뮤니티 4개 컬렉션(`request.path[3]` 기준)만 제외해 전용 규칙이 적용되게 했다. 나머지 컬렉션을 좁히는 것은 **별도 보안 작업**으로 남긴다(§8, DataModel §1 `[운영]`).
- `deployed/storage.rules` = `community-storage.rules` + 기존 규칙(`/{allPaths=**}` 개방·`/{uid}/**` 소유자). `community/` 접두는 와일드카드에서 제외.
- `deployed/firestore.indexes.json` = 기존 인덱스 11개(gear·gears·gear-rank·comments(parentId)·community-posts) + 커뮤니티 신규 3 + fieldOverrides 3. 인덱스 배포는 파일에 없는 인덱스를 삭제하려 하므로 **항상 이 병합본 기준으로 배포**한다.
- 배포 전 검증: Firestore·Storage 에뮬레이터에서 기존 경로 비로그인 읽기/쓰기 허용 유지, 커뮤니티 컬렉션·경로 비로그인 거부, png 거부 확인.
- Cloud Functions 5개는 `lessismore` 레포 `functions/`에서 `--only functions:<이름>` 지정 배포(`--force`는 retry 정책 확인용).
- 2026-09-03 2차: 투표 변경 허용(CM-5 개정) 규칙을 같은 병합 방식으로 재배포(`deployed/firestore.rules` 갱신). Storage 규칙·인덱스는 변경 없음.
- 2026-09-03 3차: 피드 정렬 인기순용 인덱스 2개(likeCount desc) 추가 배포(`deployed/firestore.indexes.json` 갱신, 총 16개 + overrides 3).
- 2026-09-05 4차: 첨부 모델 규칙과 `community-posts` 인덱스 4개(`hasBagSnapshot`·`hasPoll`의 최신순·인기순)를 교체 배포했다. 규칙 배포 **전에** `scripts/migrate-community-attachments.mjs --apply`로 7개 문서를 백필하고 대상 0건을 확인했으며, 쓰기 전 백업은 `scripts/backup-community-posts-2026-09-05T00-53-28-310Z.json`이다. 이후 `deployed/firestore.rules`·`deployed/firestore.indexes.json`을 갱신했다.

## 배낭 코스 (DM-30, BagDetail.md BD-11)

배낭 코스는 앱에서 **공개 문서 아래에 비공개 하위 컬렉션을 두는 첫 사례**다.

`bag/{bagId}` 문서는 `shared == true` 면 링크만 있으면 비로그인 누구나 읽는다(BD-7). 그런데 GPX 는 그 사람이 언제 어디를 지날지를 미터 단위로 담는다. 그래서 하위 `routes` 는 **소유자(`bag.userId`)만** 읽고 쓰며, 배낭 공유·박지 후기 첨부·커뮤니티 패킹 스냅샷 어디로도 따라가지 않는다(DM-30).

판정 소스는 `bag/{bagId}.userId` **하나**다. Firestore 는 `get()`, Storage 는 `firestore.get()` 으로 같은 값을 본다 — 그룹이 `memberIds` 하나로 통일한 것과 같은 이유다.

### 규칙 구조

| 헬퍼 | 역할 |
| --- | --- |
| `isBagOwner()` | `bag/{bagId}.userId == request.auth.uid`. Firestore·Storage 양쪽에 같은 이름·같은 판정 |
| `isValidBagRoutePayload()` | 그룹 `isValidRoutePayload()` 와 **같은 조건** + 허용 키 못박기. `authorId`·`authorName` 이 없는 것이 유일한 차이다(DM-30 — 배낭 코스는 소유자 한 사람의 것이라 작성자를 적지 않는다) |
| `isBagGpxFile()` | Storage 파일명 `^[A-Za-z0-9_-]+\.gpx$` |

값 검증 헬퍼(`isValidLatitude`·`isValidLongitude`·`maxRouteFileSize`)는 **그룹 절의 것을 그대로 쓴다** — 같은 값을 두 벌로 두지 않으며, 중복 정의는 컴파일 에러이기도 하다.

`allow update: if false` 다. 코스는 이름 변경이 필요 없어 수정 경로를 두지 않는다(그룹 코스와 같다).

### 배낭 규칙 병합 시 주의 (필수)

**이 절의 병합은 2026-09-18에 적용을 마쳤다**(`deployed/firestore.rules`·`deployed/storage.rules`).

병합 전 `bag` 은 맨 끝 전면 개방 절(`match /{document=**}`)에 걸려 있었다. Firestore 규칙은 여러 `match` 가 **OR** 로 합쳐지므로, 개방 절이 남아 있으면 `routes` 를 아무리 좁혀도 비로그인 누구나 읽을 수 있다. `users` 에 쓴 방법을 그대로 따른다 — **`bag` 을 통째로 개방에서 뺀 뒤 문서 자체는 다시 열고 하위 `routes` 만 닫는다.**

```
function isLockedCollection() {
  return request.path[3] in [
    'community-posts', 'community-post-likes', 'community-poll-votes',
    'community-reports', 'groups', 'groupInvites', 'users', 'bag'
  ];
}

// 배낭 문서 자체는 기존대로 열어 둔다 — shared 링크 공유가 이 개방에 얹혀 있다(BD-7).
match /bag/{bagId} {
  allow read, write: if true;
}

// 배낭 하위는 routes 만 빼고 기존대로 열어 둔다.
match /bag/{bagId}/{subCollection}/{restOfPath=**} {
  allow read, write: if subCollection != 'routes';
}
```

- **`request.path.size()` 를 쓰면 안 된다** — 규칙 언어에 없는 함수라 `Function not found error: Name: [size]` 로 평가 전체가 에러가 되고 해당 경로가 전부 거부되는 회귀가 난다(2026-09-17 그룹 병합에서 실제로 겪었다).
- **하위 개방 절을 빠뜨리지 않는다.** 지금 `bag` 에 다른 하위 컬렉션은 없지만, 개방에서 `bag` 을 뺀 이상 이 절이 없으면 나중에 생기는 하위 컬렉션이 소리 없이 전부 거부된다.
- Storage `deployed/storage.rules` 도 같은 이유로 `bags/` 접두를 개방에서 뺀다.

```
match /{allPaths=**} {
  allow read, write: if allPaths[0] != 'community'
    && allPaths[0] != 'groups'
    && allPaths[0] != 'bags';
}
```

### 규칙으로 표현하지 못해 남긴 구멍

1. **배낭당 코스 5개 상한을 규칙이 강제하지 못한다.** 규칙은 컬렉션 문서 수를 셀 수 없고, 그룹처럼 카운터를 같은 커밋에 묶으려면 `bag` 문서에 `routeCount` 를 새로 둬야 한다. `bag` 은 공유 링크로 공개되는 문서라 "이 사람이 코스를 몇 개 갖고 있다"가 함께 새고, 무엇보다 **배낭 코스는 소유자 한 사람의 것이라 상한을 넘겨도 피해가 자기 배낭 안에 갇힌다**(그룹은 여럿이 공유 예산을 쓰므로 카운터가 필요했다). 클라이언트가 세어서 막고, 상한은 `GroupLimits.GROUP_MAX_ROUTE_COUNT` 하나를 그룹과 함께 쓴다(DM-30 — 수치를 갈라 두지 않는다).
2. **`bag` 문서 자체는 여전히 전면 개방이다.** 좁히는 것은 별도 보안 작업이다(DataModel §1 `[운영]`). 이 병합은 하위 `routes` 하나만 닫는다.
3. **Storage 파일과 Firestore 문서의 동반 삭제는 클라이언트 몫이다.** 규칙은 둘을 묶지 못한다. 배낭 삭제 시의 연쇄 정리(하위 `routes` 문서 + Storage GPX)는 서버 트리거(`onBagDeleted`)가 맡는다(DM-30) — **아직 배포되지 않았다.**

### 에뮬레이터 검증 (2026-09-18)

하네스는 저장소에 넣지 않는다. 스크래치패드에서 Java 17 · Firestore 8095 · Storage 9296 으로 돌렸다.

**Storage 에뮬레이터는 규칙을 전역으로 받는다**(Firestore 처럼 프로젝트별이 아니다). 병합본과 병합 전을 한 프로세스에서 같이 올리면 나중에 로드한 쪽이 앞의 것을 덮어쓰므로, **모드를 나눠 두 번 실행**하고 회귀 결과 문자열을 파일로 남겨 바깥에서 대조했다. 또 테스트 프로젝트 ID는 에뮬레이터 기동 프로젝트와 **같아야 한다** — Storage 규칙의 `firestore.get()` 교차 조회가 그 프로젝트의 Firestore 를 보기 때문에, 다르면 소유자 판정이 전부 거부된다.

| 묶음 | 대상 | 건수 | 결과 |
| --- | --- | --- | --- |
| (a) 배낭 코스 | 병합본 Firestore — 소유자·타인·비인증·페이로드 | 28 | 통과 |
| (a) 배낭 코스 | 병합본 Storage — GPX | 11 | 통과 |
| (b) 회귀 | 병합본 Firestore + Storage (기존 개방·커뮤니티·그룹) | 29 | 통과 |
| (b) 회귀 | **병합 전** 같은 하네스 | 29 | 통과 |

핵심 시나리오 결과:

| 시나리오 | 결과 |
| --- | --- |
| 소유자의 코스 읽기·목록·생성·삭제 | 허용 |
| 소유자의 코스 수정(update) | 거부 |
| 남의 코스 읽기·목록·쓰기·삭제 | 거부 |
| **비인증이 `shared=true` 배낭의 코스 읽기·목록** | **거부** |
| 로그인한 남이 `shared=true` 배낭의 코스 읽기 | 거부 |
| 비인증이 `bag/{bagId}` 문서 읽기·쓰기 | **허용(회귀 없음)** |
| 비인증이 `bag/{bagId}/misc/**`(routes 아닌 하위) 읽기·쓰기 | 허용 |
| 페이로드: 5MB 초과·`fileSize` 0·남의 `storagePath`·이름 41자·빈 이름·`simplified` 1점·501점·위도 범위 밖·`authorId` 추가·임의 키 추가·음수 거리 | 모두 거부 |
| 페이로드: 정확히 5MB · `elevationGain` 없는 코스 | 허용 |
| Storage: 소유자 get·업로드·삭제 | 허용 |
| Storage: 비인증 get · 남의 배낭 get/업로드/삭제 · 비 `.gpx` · `routes` 밖 경로 · 5MB 초과 · list | 모두 거부 |

회귀 29건은 **병합 전 파일(`git show HEAD:...`)과 병합본을 같은 하네스로 돌려 결과 문자열이 글자까지 같음**(`diff` 무출력)을 대조해 확인했다. 즉 기존 컬렉션·경로의 허용·거부가 한 건도 달라지지 않았다.

Storage 개방 경로의 `list` 는 **병합 전에도 거부된다**(`match /{allPaths=**}` 가 list 요청에서 `allPaths[0]` 을 묶지 못한다 — 위 그룹 절이 기록한 기존 경고와 같은 원인). 병합이 만든 문제가 아니라는 것을 병합 전/후 대조로 확인했다.

규칙 파일은 에뮬레이터 로드로 컴파일을 확인했으며 **배포하지 않았다**.

### 배낭 코스 병합 기록 (2026-09-18)

- `deployed/firestore.rules` = 기존 병합본 + `bag-firestore.rules` 본문(`bag/{bagId}/routes/{routeId}`). 맨 끝 개방 절의 `isLockedCollection()` 에 `bag` 을 추가하고, `match /bag/{bagId}`(개방 유지) + `match /bag/{bagId}/{subCollection}/{restOfPath=**}`(`routes` 만 제외)로 갈라 열었다. 커뮤니티·그룹·기타 컬렉션의 허용 범위는 **한 글자도 바꾸지 않았다**.
- `deployed/storage.rules` = 기존 병합본 + `bag-storage.rules` 본문. 개방 절을 `allPaths[0] != 'community' && != 'groups' && != 'bags'` 로 바꿨다.
- `deployed/firestore.indexes.json` = **변경 없음**. `bag/{bagId}/routes` 는 `orderBy('createdAt')` 단일 필드 정렬 하나뿐이라 자동 인덱스로 충분하다. 코스 개수 확인은 같은 컬렉션의 count 집계라 인덱스가 따로 필요 없다.

### 배낭 코스 배포 전 확인

1. [ ] **규칙은 `deployed/` 병합본으로만** — `firebase deploy --only firestore:rules,storage`. 원본 `bag-firestore.rules`·`bag-storage.rules` 를 단독 배포하면 기존 컬렉션 규칙이 통째로 날아간다.
2. [ ] **배포 직전 에뮬레이터 회귀 재실행** — 위 두 묶음을 병합본·병합 전으로 각각 돌려 실패 0 과 회귀 문자열 일치를 확인한다. 개방 범위를 실수로 좁히면 앱 전체가 죽는다.
3. [ ] **마이그레이션 선행 불필요** — `bag/{bagId}/routes` 는 기존 문서가 없는 신규 컬렉션이다. `bag` 문서 자체의 규칙은 바뀌지 않으므로 기존 배낭에 영향이 없다.
4. [ ] **배낭 삭제 정리 트리거(`onBagDeleted`)는 별도 배포다**(DM-30). 트리거가 없는 동안 배낭을 지우면 하위 `routes` 문서와 Storage GPX 가 남는다 — 규칙상 아무도 읽을 수 없는(소유자 판정에 쓰는 `bag` 문서가 사라졌다) 고아가 되므로 노출 위험은 없지만 용량이 남는다.
5. [ ] **배포 후 확인** — 비인증으로 `shared=true` 배낭의 `routes` 읽기 거부, 같은 배낭 문서 읽기 허용을 콘솔 Rules 시뮬레이터로 한 번 더 본다.

## 그룹 (DM-29, Group.md GRP-1~12)

그룹은 앱에서 처음으로 **특정 사용자 집합에게만 보이는 데이터**를 도입한다. 기존 가시성은 공개(커뮤니티·박지 카탈로그), 본인만(`users/*`), 링크를 아는 사람 전부(`bag.shared`) 세 가지뿐이었다.

멤버십 판정 소스는 `groups/{groupId}.memberIds` **하나**다. Firestore 하위 컬렉션도, Storage GPX도 모두 이 배열 하나를 조회해 판정하므로 규칙이 갈라지지 않고 비용도 예측 가능하다(배열 상한 20).

### 규칙 구조

| 헬퍼 | 역할 |
| --- | --- |
| `signedIn()` / `isOwner(userId)` | 인증 여부 / 문서 ID가 요청자 uid인지 |
| `groupBefore(groupId)` / `groupAfter(groupId)` | 그룹 문서의 커밋 **전**(`get`) / **후**(`getAfter`) 상태 |
| `isGroupMember` / `willBeGroupMember` / `isGroupOwner` | 멤버십·방장 판정. 생성 배치는 `willBeGroupMember`(커밋 후)를 쓴다 |
| `isValidGroupPayload()` | 이름 2~40자, `YYYY-MM-DD` 기간, `meetingNote` 200자, `campSpotId`·`destinationName` 형태 |
| `isGroupOwnerEdit()` / `isGroupJoin()` / `isGroupLeaveOrKick()` / `isGroupCounterUpdate()` | `groups` update 의 네 경로. 이 넷 밖의 update는 전부 거부된다 |
| `groupWritableKeys()` | 클라이언트가 쓸 수 있는 그룹 키 목록. 서버 전용 `deletedCleanedAt`이 빠져 있다 |
| `isValidBagSnapshot()` | 배낭 스냅샷 허용 키 못박기 — **개인정보 계약의 마지막 방어선** |
| `isValidPointPayload()` / `isValidRoutePayload()` | 포인트 유형 enum 4종·제목 40자·설명 200자 / 코스 이름 40자·`storagePath` 고정·5MB·`simplified` 500점 |

역인덱스 `users/{uid}/groups/{groupId}`는 **본인만 읽기·쓰기**이며 허용 키는 DM-29 표 그대로 `name`·`startDate`·`endDate`·`role`·`joinedAt`·`ownerId`·`memberCount`·`hasBag`(필수)과 `campSpotId`·`destinationName`(선택)이다. `hasBag`은 본인이 배낭을 연결·해제할 때 갱신하므로 부분 갱신(`updateDoc`)이 허용된다. 다만 규칙이 `hasBag == ('bagId' in data)` 를 강제하므로 **`hasBag`과 `bagId`는 반드시 함께 움직인다** — `bagId` 없이 `hasBag: true` 만 쓰면 거부된다(2026-09-17 에뮬레이터 확인). 이름·기간 등 그룹 정보가 바뀔 때 멤버 전원의 역인덱스를 갱신하는 것은 남의 문서 쓰기라 규칙이 막는다 — 서버 작업이 맡는다(DM-29).

**참여·탈퇴는 배열 diff 없이 표현한다.** 규칙 언어에 배열 diff 연산이 없어 `size()` 비교 + `hasAll` + `in` 조합으로 좁혔다. 참여는 `after.size() == before.size() + 1 && after.hasAll(before) && uid in after && !(uid in before)`, 탈퇴/내보내기는 `after.size() == before.size() - 1 && before.hasAll(after) && ownerId in after`다. 이 조합은 `memberIds`에 중복 원소가 없다는 전제에서 완전하고, 중복은 생성 규칙(`memberIds == [uid]`)과 위 두 경로가 귀납적으로 막는다.

### 클라이언트 쓰기 계약 (T1 데이터 레이어)

포인트 50개·코스 5개 상한은 규칙만으로는 컬렉션 문서 수를 셀 수 없어 강제할 수 없다. 대신 **문서 생성·삭제와 `groups.pointCount`/`routeCount` ±1 을 같은 커밋으로 묶어** 상한을 강제한다.

> `createPoint` / `deletePoint` / `createRoute` / `deleteRoute` 는 반드시 하위 문서와 그룹 카운터를 **한 커밋**으로 쓴다. 카운터만 따로 쓰거나 문서만 따로 쓰면 규칙이 거부한다.

`writeBatch`든 `runTransaction`이든 단일 커밋이라 `getAfter` 대조가 똑같이 동작한다 — 둘 다 에뮬레이터로 확인했다(T1 구현은 `runTransaction`).

카운터는 **기존값 ±1 로만** 바뀐다(임의값 세팅 불가). 방장 편집 경로에서는 불변이다.

### 규칙으로 표현하지 못해 남긴 구멍

1. **포인트·코스 카운터 griefing** — 문서를 만들지 않고 카운터만 올려 그룹의 포인트(50)·코스(5) 예산을 소진할 수 있다. 포인트·코스 문서 ID가 랜덤이라 커뮤니티 좋아요(`uid_postId`)처럼 결정적 ID로 `existsAfter()` 대조를 할 수 없기 때문이다. 그룹은 초대로만 들어오는 20인 이하 집단이고 피해가 그 그룹 안에 갇히므로 수용한다(2026-09-17 결정).
2. **기간 30일 상한 미강제** — 규칙 언어에 문자열 날짜 산술이 없다. `YYYY-MM-DD`는 사전순 비교가 곧 날짜순이라 `startDate <= endDate`만 강제하고, "최대 30일"(GRP-2)은 클라이언트 검증에 맡긴다.
3. **`name` trim 미강제** — 규칙에서 공백 정규화를 할 수 없다. 길이(2~40)만 막고 trim은 클라이언트 몫이다.
4. **`gears[]` 원소별 키 미강제** — 규칙 언어에 리스트 순회가 없어 배열 원소의 키를 제한할 수 없다. 문서 **최상위** 허용 키는 못박았으므로 `memo`·좌표·`activity`는 막히지만, `gears[i].imageUrl` 같은 원소 내부 필드는 규칙이 막지 못한다. 스냅샷 빌더가 DM-28 제외 목록을 한 곳에서 파생하는 것이 실질 방어선이다(DM-29).
5. **`memberCount` 이외 캐시의 정합성** — `pointCount`/`routeCount`는 배치 결합으로 ±1만 허용하지만, 실제 하위 문서 수와의 일치는 서버 정리 작업이 보정해야 한다.
6. **내보내기 대상 특정 불가** — 방장 내보내기 경로는 "방장이 아닌 원소 하나가 빠졌다"까지만 좁힌다. 어떤 멤버가 빠졌는지는 규칙이 지정하지 않는다(방장의 권한 범위 안이라 문제가 되지 않는다).
7. **Storage 코스 삭제는 그룹원까지만** — 파일 삭제의 작성자·방장 판정은 Firestore 규칙이 하고, Storage 규칙은 그룹원인지만 본다. 교차 조회를 한 번 더 하는 비용 대비 실익이 없고, 파일만 지우고 문서를 남기는 요청은 그룹 안에서 복구 가능한 손상이기 때문이다.
8. **해산 연쇄 정리는 규칙 밖** — 그룹 문서를 지워도 하위 컬렉션과 Storage GPX는 남는다. 재시도 가능한 서버 작업이 맡는다(GRP-12, DM-29 서버 작업). 클라이언트가 그룹 문서와 포인트를 같은 배치로 지우면 카운터 대조(`getAfter`)가 실패해 거부되므로, 클라이언트는 해산 시 그룹 문서만 지운다.

### 인덱스 — `group-firestore.indexes.json`이 비어 있는 이유

DM-29 인덱스 절 그대로, 그룹은 **복합 인덱스가 필요 없다**.

- `users/{uid}/groups` — `startDate` 단일 필드 정렬만 쓴다. 한 사용자의 그룹은 20개 상한이라 지난 그룹 분리(GRP-1)는 전량 조회 후 클라이언트에서 가른다.
- `groups/{groupId}/points`, `groups/{groupId}/routes` — `createdAt` 단일 필드 정렬.
- `groups` 컬렉션 자체는 `list`를 금지하므로 쿼리가 없다.

따라서 파일은 `{"indexes": [], "fieldOverrides": []}`이고, 배포 시 `deployed/firestore.indexes.json`에 **추가할 항목이 없다**. 파일을 둔 것은 "그룹은 인덱스가 없다"를 계약으로 남기기 위해서다. 그룹 쿼리를 추가할 때 이 파일부터 갱신한다.

### 그룹 규칙 병합 시 주의 (필수)

**이 절의 병합은 2026-09-17에 적용을 마쳤다**(`deployed/firestore.rules`·`deployed/storage.rules`). 아래는 적용된 패턴과 그 근거이며, 병합본을 다시 손댈 때 지켜야 할 계약이다.

병합 전 프로덕션 `deployed/firestore.rules` 맨 끝은 전면 개방 절이었다.

```
function isCommunityCollection() {
  return request.path[3] in ['community-posts', 'community-post-likes', 'community-poll-votes', 'community-reports'];
}

match /{document=**} {
  allow read, write: if !isCommunityCollection();
}
```

Firestore 규칙은 여러 `match`가 **OR**로 합쳐진다. 이 개방 절이 남아 있으면 그룹 전용 규칙을 아무리 좁혀도 아무나 `groups`를 읽고 쓸 수 있다. **그룹 컬렉션과 `users/{uid}/groups` 하위 경로를 개방에서 반드시 뺀다.**

`users/{uid}/groups`는 중첩 경로라 `request.path[3]`(최상위 컬렉션명)만으로는 걸러지지 않는다. **`request.path.size()`를 쓰면 안 된다** — 규칙 언어에 그 함수가 없어 `Function not found error: Name: [size]` 로 평가 전체가 에러가 되고, `users/*` 전 경로가 거부되는 회귀가 난다(2026-09-17 에뮬레이터 확인). 대신 `users` 를 통째로 개방에서 빼고 하위 경로를 갈라 연다.

```
function isLockedCollection() {
  return request.path[3] in [
    'community-posts', 'community-post-likes', 'community-poll-votes',
    'community-reports', 'groups', 'groupInvites', 'users'
  ];
}

// users 문서 자체는 기존대로 열어 둔다.
match /users/{userId} {
  allow read, write: if true;
}

// users 하위는 groups 만 빼고 기존대로 열어 둔다(users/{uid}/gears 등).
match /users/{userId}/{subCollection}/{restOfPath=**} {
  allow read, write: if subCollection != 'groups';
}

match /{document=**} {
  allow read, write: if !isLockedCollection();
}
```

Storage `deployed/storage.rules`도 같은 이유로 `groups/` 접두를 개방에서 뺀다.

```
match /{allPaths=**} {
  allow read, write: if allPaths[0] != 'community' && allPaths[0] != 'groups';
}
```

병합 후에는 아래 회귀 시나리오를 반드시 다시 돌린다 — `users/{uid}`·`users/{uid}/gears`·`bag`·`gears/`·`/community/**`가 **기존과 똑같이 열려 있어야** 한다. 개방 범위를 실수로 좁히면 앱 전체가 죽는다. (기존 컬렉션을 의도적으로 좁히는 것은 별도 보안 작업이다 — DM-29 선행 보안 작업, DataModel §1 `[운영]`.)

헬퍼 이름 충돌: 그룹 원본과 커뮤니티 병합본에 `signedIn()`·`isOwner(userId)`가 양쪽에 있고 **정의가 글자까지 같다**. 병합본은 커뮤니티 절의 것 하나만 두고 그룹 절이 그대로 재사용한다(중복 정의는 컴파일 에러). 나머지 그룹 헬퍼 이름은 커뮤니티와 겹치지 않는다 — 비슷해 보이는 `unchangedCount(field)`(커뮤니티)와 `unchangedField(field)`(그룹)는 이름이 다르므로 그대로 둔다.

### 에뮬레이터 검증 절차

저장소에는 하네스를 넣지 않는다. 스크래치패드에서 다음과 같이 돌린다(Java 17 필요, 포트는 다른 작업과 겹치지 않게 8095 이상을 쓴다).

```bash
mkdir -p /tmp/group-rules && cd /tmp/group-rules
npm init -y && npm i @firebase/rules-unit-testing firebase
# firebase.json 에 firestore(8095)·storage(9296) 포트와 규칙 파일 경로를 적고
firebase emulators:exec --only firestore,storage --project demo-group-rules "node GroupRulesTest.mjs"
```

2026-09-17 1차(원본 3종 단독) 검증: Firestore 73건 / Storage 10건.

2026-09-17 2차(**병합본** `deployed/firestore.rules`·`deployed/storage.rules`) 검증: 총 **126건 전부 통과(실패 0)**.

| 묶음 | 대상 | 건수 | 결과 |
| --- | --- | --- | --- |
| (a) 그룹 규칙 | 병합본 Firestore — 그룹 전 시나리오 | 74 | 통과 |
| (a) 그룹 규칙 | 병합본 Storage — GPX | 10 | 통과 |
| (a) 그룹 규칙 | 병합본 개방 절 누수(그룹·역인덱스) | 9 | 통과 |
| (b) 회귀 | 병합본 Firestore — 기존 개방 14 + 커뮤니티 12 | 26 | 통과 |
| (b) 회귀 | 병합본 Storage — 개인 사진·커뮤니티·크롤 | 7 | 통과 |

회귀 26건은 **병합 전 파일(`git show HEAD:...`)과 병합본을 같은 하네스로 돌려 결과 문자열이 글자까지 같음**을 대조해 확인했다(Storage 목록 조회 5건도 동일 방식으로 대조). 즉 기존 컬렉션의 허용·거부가 한 건도 달라지지 않았다.

Storage 에뮬레이터 로그에 뜨는 `storage.rules line [65] ... Variable  is not bound in path template`는 목록(list) 요청이 `match /{allPaths=**}`의 `allPaths[0]`을 평가할 때 나는 경고로, **병합 전 파일에서도 같은 위치의 같은 식에서 동일하게 발생**한다(대조 확인). 병합이 만든 문제가 아니다.

규칙 파일은 에뮬레이터 로드로 컴파일을 확인했으며 **배포하지 않았다**. 하네스는 스크래치패드에만 두고 저장소에 넣지 않는다.

### 그룹 병합 기록 (2026-09-17)

- `deployed/firestore.rules` = 기존 병합본 + `group-firestore.rules` 본문(그룹 헬퍼 · `groups/{groupId}` 및 하위 `members`·`bags`·`points`·`routes` · `users/{uid}/groups/{groupId}` 역인덱스 · `groupInvites/{groupId}`). 맨 끝 개방 절의 `isCommunityCollection()`을 `isLockedCollection()`으로 바꾸고 `groups`·`groupInvites`·`users`를 추가했으며, `users`는 `match /users/{userId}`(개방 유지) + `match /users/{userId}/{subCollection}/{restOfPath=**}`(`groups`만 제외)로 갈라 열었다. 커뮤니티·기타 컬렉션의 허용 범위는 **한 글자도 좁히지 않았다**.
- `deployed/storage.rules` = 기존 병합본 + `group-storage.rules` 본문. 개방 절을 `allPaths[0] != 'community' && allPaths[0] != 'groups'`로 바꿨다.
- `deployed/firestore.indexes.json` = **변경 없음**. 그룹 쿼리는 전부 단일 필드다 — `users/{uid}/groups`의 `orderBy('startDate')`와 `where('bagId','==',…)`(`syncBagSnapshots`, 다른 필터·정렬 없음), `groups/{id}/members`의 `orderBy('joinedAt')`, `points`·`routes`의 `orderBy('createdAt')`. 단일 필드는 Firestore 자동 인덱스로 충분하고, 이 파일의 `fieldOverrides` 3건은 전부 `comments` 대상이라 `groups`의 자동 인덱싱을 끄지 않는다. 그룹에 **복합 인덱스를 추가할 항목이 없다**.

### 그룹 배포 전 확인

**순서를 지킨다: ① Functions → ② 규칙 → ③ 앱.** 초대 미러 트리거(`groups/{groupId}` 쓰기 → `groupInvites/{groupId}`)가 먼저 떠 있어야 미러 문서가 생긴다. 규칙을 먼저 배포하면 `groupInvites` 쓰기가 클라이언트에 전면 금지인 상태에서 미러가 없어, 초대 링크를 연 **비인증 웹 랜딩이 그룹 이름·기간·정원을 못 읽고 축소 형태로 떨어진다**.

1. [ ] **Functions 먼저** — 별도 레포 `lessismore`의 `functions/`(리전 `asia-northeast3`)에서 초대 미러 트리거를 `--only functions:<이름>`으로 배포하고, 테스트 그룹 하나를 만들어 `groupInvites/{groupId}` 미러가 생기는지 콘솔에서 확인한다. 서버 전용 필드 `deletedCleanedAt`과 해산·탈퇴·회원 탈퇴 연쇄 정리, 역인덱스 갱신도 같은 레포가 맡는다.
2. [ ] **기존 그룹 문서 백필** — Functions 배포 전에 만들어진 그룹이 있으면 미러가 없다. 트리거를 배포한 뒤 해당 그룹들을 한 번씩 touch(`updatedAt` 갱신)해 미러를 채우고 대상 0건을 확인한다. (신규 출시라면 해당 없음.)
3. [ ] **규칙은 `deployed/` 병합본으로만** — `firebase deploy --only firestore:rules,storage`. 원본 `group-firestore.rules`·`group-storage.rules`를 단독 배포하면 기존 컬렉션 규칙이 통째로 날아간다.
4. [ ] **인덱스는 건드리지 않는다** — 그룹은 추가 항목이 없다. 인덱스를 배포해야 할 다른 이유가 생기면 `deployed/firestore.indexes.json` 병합본으로만 한다(파일에 없는 인덱스를 **삭제**하려 하기 때문).
5. [ ] **배포 직전 에뮬레이터 회귀 재실행** — 위 "에뮬레이터 검증 절차"의 두 묶음(그룹 74+10+9 / 회귀 26+7)을 병합본으로 돌려 실패 0을 확인한다. 개방 범위를 실수로 좁히면 앱 전체가 죽는다.
6. [ ] **마이그레이션 선행 불필요** — 그룹은 기존 문서가 없는 신규 컬렉션이라 §8의 "마이그레이션 → 대상 0건 → 규칙 배포" 순서가 해당하지 않는다.
7. [ ] **배포 후 확인** — 비인증으로 `groups/{id}` 읽기 거부, 인증 비멤버 `get` 허용·하위 컬렉션 거부, 비인증 `groupInvites/{id}` 읽기 허용을 콘솔 Rules 시뮬레이터로 한 번 더 본다.
8. [ ] **롤백 경로** — 문제가 나면 `deployed/backup-2026-09-03-*.rules`가 아니라 **직전 병합본**(이 커밋 이전 `deployed/*.rules`)으로 되돌린다. 백업 파일은 커뮤니티 이전의 전면 개방본이라 되돌리면 커뮤니티 규칙까지 사라진다.

## 배포 기록 (2026-09-23)

- `deployed/firestore.rules`·`deployed/storage.rules` 배포. 이번에 함께 올라간 것:
  - **배낭 코스 잠금**(DM-30) — `bag`을 전면 개방에서 빼고 문서 자체는 다시 열되 하위 `routes`와 Storage `bags/`만 소유자로 닫았다. 공유를 켠 배낭의 코스가 비로그인에 읽히던 구멍이 닫혔다.
  - 그룹·배낭 코스 create 허용 키에 `elevationLoss?` 추가(코스 뒤집기의 상승 값, GRP-8). 이게 없으면 새 코드의 코스 업로드가 permission-denied로 깨진다.
- 배포 직후 프로덕션 비인증 검증 13건 통과: `gear`·`gear-rank`·`bag` 문서·`users`·`users/{uid}/gears` 개방 유지 / `groups`·`users/{uid}/groups`·`groupInvites` 목록 차단 / `groupInvites` get 허용 / `bag/{id}/routes` 읽기·쓰기 차단 / Storage `bags/` GPX 읽기 차단.
- 롤백본: 직전 배포본은 커밋 `3b13621`의 `deployed/*.rules`다.
