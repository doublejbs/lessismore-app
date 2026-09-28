// 초대 수락 화면의 상태 (GRP-3). 상태마다 본문과 주 액션이 갈린다.
enum GroupJoinStatus {
  Loading = 'loading',
  // 로그인 전이다. 전역 로그인 모달을 띄우고 로그인하면 같은 화면에서 이어간다.
  NeedLogin = 'needLogin',
  // 참여할 수 있다.
  Ready = 'ready',
  // 이미 멤버다 — 참여 화면 대신 그룹 상세로 보낸다.
  AlreadyMember = 'alreadyMember',
  Full = 'full',
  InviteDisabled = 'inviteDisabled',
  NotFound = 'notFound',
  // groupId 없이 들어왔다(잘못된 링크).
  InvalidLink = 'invalidLink',
  LoadFailed = 'loadFailed',
}

export default GroupJoinStatus;
