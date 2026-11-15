// 내가 차단한 사용자 한 명(DM-38 `users/{uid}/blocked-users/{blockedUid}`).
interface BlockedUser {
  readonly uid: string;
  // 차단 당시 닉네임 — 해제 목록 표시용이며 갱신하지 않는다.
  readonly name: string;
  readonly createdAt: Date | null;
}

export default BlockedUser;
