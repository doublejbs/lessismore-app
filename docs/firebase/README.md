# 커뮤니티 Firebase 계약

이 디렉터리는 DM-28의 Firestore·Storage 보안 규칙과 복합 인덱스 문서다. 앱에서 자동 배포하지 않으며, **콘솔 배포 전 사용자 확인 필요** 사항이다.

## 배포 전 확인

1. 규칙의 운영자 예외와 좋아요·댓글·투표 카운트 검증 범위를 실제 운영 방식과 대조한다.
2. `community-firestore.rules`의 내용을 Firebase 콘솔 Firestore Rules 편집기에 붙여 넣고 시뮬레이터로 비로그인 읽기, 본인 쓰기, 타인 쓰기를 확인한다.
3. `community-storage.rules`의 내용을 Storage Rules 편집기에 붙여 넣고 공개 읽기, 본인 JPEG 업로드·삭제, 타인 경로 및 목록 조회 차단을 확인한다.
4. CLI를 사용할 때는 프로젝트 설정 파일에서 이 규칙 파일을 명시한 뒤 `firebase deploy --only firestore:rules,storage`를 실행한다. 실행 전 프로젝트와 대상 파일을 확인한다.
5. 인덱스 쿼리에서 Firebase가 생성한 콘솔 링크를 아래에 기록한다.

## 인덱스 생성 콘솔 링크

- 게시글 전체 피드: (콘솔 링크 기록)
- 게시글 유형 필터: (콘솔 링크 기록)
- 댓글 상태·생성 시각: (콘솔 링크 기록)
- 신고 상태·생성 시각: (콘솔 링크 기록)

댓글 쿼리는 `status in ['published', 'deleted']`와 `createdAt asc`를 사용하므로 `status`는 배열 포함 인덱스로 기록했다. 실제 Firebase CLI가 요구하는 형식과 프로젝트 콘솔 결과가 다르면 배포 전에 이 문서를 먼저 갱신한다.
