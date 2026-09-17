# Firebase 계약 (커뮤니티 · 그룹)

이 디렉터리는 DM-28(커뮤니티)·DM-29(그룹)의 Firestore·Storage 보안 규칙과 복합 인덱스 문서다. 앱에서 자동 배포하지 않으며, **콘솔 배포 전 사용자 확인 필요** 사항이다.

## 배포 대상 파일

| 파일 | 대상 | 근거 스펙 |
| --- | --- | --- |
| `community-firestore.rules` | 커뮤니티 4개 컬렉션 | DM-28, Community.md |
| `community-storage.rules` | `/community/**` | DM-9, CM-6 |
| `community-firestore.indexes.json` | 커뮤니티 복합 인덱스 7 + fieldOverrides 3 | DM-28 |
| `group-firestore.rules` | `groups/**`, `users/{uid}/groups/**` | DM-29, Group.md GRP-3·4·5·8·9·12 |
| `group-storage.rules` | `/groups/{groupId}/routes/*.gpx` | DM-9, GRP-8 |
| `group-firestore.indexes.json` | (비어 있음 — 아래 그룹 절 참고) | DM-29 인덱스 |

**어떤 파일도 단독으로 배포하지 않는다.** 실제 배포는 `deployed/` 병합본 기준이며, 인덱스 배포는 파일에 없는 인덱스를 **삭제**하려 하므로 특히 병합본만 쓴다.

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

역인덱스 `users/{uid}/groups/{groupId}`는 **본인만 읽기·쓰기**이며 허용 키는 DM-29 표 그대로 `name`·`startDate`·`endDate`·`role`·`joinedAt`·`ownerId`·`memberCount`·`hasBag`(필수)과 `campSpotId`·`destinationName`(선택)이다. `hasBag`은 본인이 배낭을 연결·해제할 때 갱신하므로 단독 부분 갱신이 허용된다. 이름·기간 등 그룹 정보가 바뀔 때 멤버 전원의 역인덱스를 갱신하는 것은 남의 문서 쓰기라 규칙이 막는다 — 서버 작업이 맡는다(DM-29).

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

현재 프로덕션 `deployed/firestore.rules` 맨 끝은 전면 개방 절이다.

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
    'community-reports', 'groups', 'users'
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

### 에뮬레이터 검증 절차

저장소에는 하네스를 넣지 않는다. 스크래치패드에서 다음과 같이 돌린다(Java 17 필요, 포트는 다른 작업과 겹치지 않게 8095 이상을 쓴다).

```bash
mkdir -p /tmp/group-rules && cd /tmp/group-rules
npm init -y && npm i @firebase/rules-unit-testing firebase
# firebase.json 에 firestore(8095)·storage(9296) 포트와 규칙 파일 경로를 적고
firebase emulators:exec --only firestore,storage --project demo-group-rules "node GroupRulesTest.mjs"
```

2026-09-17 검증 결과: Firestore 73건 / Storage 10건 / 병합본 회귀 16건(Firestore 9 + Storage 7), 총 99건 전부 통과(실패 0). 규칙 파일 3종은 에뮬레이터 로드로 컴파일을 확인했으며 **배포하지 않았다**.

### 그룹 배포 전 확인

1. 위 "그룹 규칙 병합 시 주의"대로 `deployed/firestore.rules`·`deployed/storage.rules`를 갱신하고, 병합본으로 에뮬레이터 회귀를 다시 돌린다.
2. 인덱스는 추가할 항목이 없으므로 `deployed/firestore.indexes.json`을 건드리지 않는다.
3. 그룹 규칙은 기존 문서가 없는 **신규 컬렉션**이라 마이그레이션 선행이 필요 없다(§8의 "마이그레이션 → 대상 0건 → 규칙 배포" 순서는 그룹에 해당하지 않는다).
4. 서버 전용 필드 `deletedCleanedAt`과 해산·탈퇴·회원 탈퇴 연쇄 정리, 역인덱스 갱신 Functions 는 별도 레포 `lessismore`의 `functions/`(리전 `asia-northeast3`)가 맡는다. 규칙 배포와 Functions 배포 순서를 함께 계획한다.
