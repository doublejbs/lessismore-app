/**
 * SUB-11: 미구독 상태에서 `오프라인` 타일을 눌러 구독 화면으로 갔을 때, 그 여행을 기억해 둔다.
 * 구매(체험 시작)에 성공해 상세로 돌아오면 **그 여행의 저장을 바로 시작**한다 — 사용자가 하려던 일을
 * 끝내 준다. 취소·실패면 상세 포커스 때 기억만 버린다(아무 일도 없다).
 *
 * 구독 화면은 라우트라 콜백을 넘길 수 없어 모듈 레벨에 한 건만 둔다(다른 핸드오프와 같은 방식).
 */
let pendingBagId: string | null = null;

export const setPendingOfflineSave = (bagId: string) => {
  pendingBagId = bagId;
};

// 이 여행의 대기 건이면 꺼내고(true) 지운다. 다른 여행이면 그대로 둔다.
export const consumePendingOfflineSave = (bagId: string): boolean => {
  if (pendingBagId !== bagId) {
    return false;
  }

  pendingBagId = null;

  return true;
};
