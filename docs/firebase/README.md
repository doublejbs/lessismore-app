# 커뮤니티 Firebase 계약

이 디렉터리는 DM-28의 Firestore·Storage 보안 규칙과 복합 인덱스 문서다. 앱에서 자동 배포하지 않으며, **콘솔 배포 전 사용자 확인 필요** 사항이다.

## 배포 전 확인

1. 규칙의 운영자 예외와 좋아요·댓글·투표 카운트 검증 범위를 실제 운영 방식과 대조한다.
2. `community-firestore.rules`의 내용을 Firebase 콘솔 Firestore Rules 편집기에 붙여 넣고 시뮬레이터로 비로그인 읽기, 본인 쓰기, 타인 쓰기를 확인한다.
3. Rules 시뮬레이터에서 존재하지 않는 좋아요·투표·신고 문서의 본인 ID 기반 `get`이 허용되는지, 타인 ID는 거부되는지 확인한다.
4. Rules 시뮬레이터에서 `comments.status in ['published', 'deleted']` 쿼리와 본문 수정·작성자 soft-delete(자리표시) 경로를 각각 확인한다.
5. `community-storage.rules`의 내용을 Storage Rules 편집기에 붙여 넣고 공개 읽기, 본인 JPEG 업로드·삭제, 타인 경로 및 목록 조회 차단을 확인한다.
6. CLI를 사용할 때는 프로젝트 설정 파일에서 이 규칙 파일을 명시한 뒤 `firebase deploy --only firestore:rules,storage`를 실행한다. 실행 전 프로젝트와 대상 파일을 확인한다.
7. 인덱스 쿼리에서 Firebase가 생성한 콘솔 링크를 아래에 기록한다.

탈퇴·삭제 연쇄 정리 Functions는 `lessismore` 레포 `functions/`(README 참조)가 담당한다. 클라이언트는 커뮤니티 문서를 추가로 삭제하지 않는다.

## 인덱스 생성 콘솔 링크

- 게시글 전체 피드: (콘솔 링크 기록)
- 게시글 유형 필터: (콘솔 링크 기록)
- 댓글 상태·생성 시각: (콘솔 링크 기록)
- 신고 상태·생성 시각: (콘솔 링크 기록)

댓글 쿼리는 `status in ['published', 'deleted']`와 `createdAt asc`를 사용하므로 `status` 오름차순·`createdAt` 오름차순 복합 인덱스로 기록했다. 컬렉션 그룹 단일 필드(`authorId`, `status`, `mentionedUserId`)는 `community-firestore.indexes.json`의 `fieldOverrides`로 배포 범위를 활성화하며, 앱 쿼리에 사용하는 복합 인덱스 4개와 함께 이 파일만 배포 기준으로 삼는다. 실제 Firebase CLI가 요구하는 형식과 프로젝트 콘솔 결과가 다르면 배포 전에 이 문서를 먼저 갱신한다.

각 컬렉션 그룹 `fieldOverrides`에는 기본 컬렉션 단일 필드 인덱스(오름차순·내림차순·array-contains)를 유지하면서 컬렉션 그룹 오름차순 범위를 추가했다. 신고 `(status, createdAt)` 복합 인덱스는 앱·서버 쿼리가 아닌 Firebase 콘솔에서 신고를 상태·시각순으로 훑기 위한 운영용 인덱스로 유지한다.

## 배포 기록 (2026-09-03)

`deployed/`에 **실제 프로덕션에 배포된 파일**을 그대로 둔다(`firebase deploy --only firestore,storage`, 프로젝트 `lessismore-7e070`).

- `deployed/firestore.rules` = `community-firestore.rules` + 기존 프로덕션 규칙 병합. **배포 전 프로덕션 규칙은 전면 개방(`allow read, write: if true`)이었다**(`deployed/backup-2026-09-03-*.rules`). 기존 컬렉션의 동작을 바꾸지 않기 위해 와일드카드 규칙을 유지하되, 커뮤니티 4개 컬렉션(`request.path[3]` 기준)만 제외해 전용 규칙이 적용되게 했다. 나머지 컬렉션을 좁히는 것은 **별도 보안 작업**으로 남긴다(§8, DataModel §1 `[운영]`).
- `deployed/storage.rules` = `community-storage.rules` + 기존 규칙(`/{allPaths=**}` 개방·`/{uid}/**` 소유자). `community/` 접두는 와일드카드에서 제외.
- `deployed/firestore.indexes.json` = 기존 인덱스 11개(gear·gears·gear-rank·comments(parentId)·community-posts) + 커뮤니티 신규 3 + fieldOverrides 3. 인덱스 배포는 파일에 없는 인덱스를 삭제하려 하므로 **항상 이 병합본 기준으로 배포**한다.
- 배포 전 검증: Firestore·Storage 에뮬레이터에서 기존 경로 비로그인 읽기/쓰기 허용 유지, 커뮤니티 컬렉션·경로 비로그인 거부, png 거부 확인.
- Cloud Functions 5개는 `lessismore` 레포 `functions/`에서 `--only functions:<이름>` 지정 배포(`--force`는 retry 정책 확인용).
