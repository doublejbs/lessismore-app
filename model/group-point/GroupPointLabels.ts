import app from '@/model/app/App';

/**
 * 그룹 포인트에만 있는 표시 값 (GRP-4 · GRP-9). 유형 라벨·색·아이콘·날짜처럼 배낭 포인트(BD-14)와
 * 함께 쓰는 값은 `model/point/PointLabels.ts`에 있다.
 */

/**
 * 작성자 표시 (GRP-4 · GRP-12).
 *
 * `(나간 멤버)` 치환은 **화면에서 파생한다** — 저장된 `authorName`을 서버가 덮어쓰지 않으므로
 * `authorId`가 현재 멤버 목록에 없으면 이 문구로 바꾼다. 회원 탈퇴는 이와 달라 서버가
 * `authorName`을 비우므로, 이름이 비어 있으면 `(탈퇴한 사용자)`다.
 */
export const getGroupPointAuthorLabel = (
  authorId: string,
  authorName: string,
  memberIds: readonly string[]
): string => {
  const l10n = app.getL10n();

  if (!authorName.trim()) {
    return l10n.t('group.detail.withdrawnUser');
  }

  if (!memberIds.includes(authorId)) {
    return l10n.t('group.detail.leftMember');
  }

  return authorName;
};
