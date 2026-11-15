// BD-1·GRP-13: 일행 초대 한 줄 측정(`click_bag_group_invite_prompt`의 `action` 값과 같다).
enum GroupInvitePromptAction {
  // 상세 진입당 1회 노출.
  Shown = 'shown',
  // 눌러 그룹 만들기로 갔다.
  Open = 'open',
}

export default GroupInvitePromptAction;
