// 그룹 역할 (GRP-4, DM-29 `groups/{groupId}/members/{uid}.role`).
// MVP에는 방장 위임이 없어 owner는 그룹 생성자 한 명으로 고정된다.
enum GroupMemberRole {
  Owner = 'owner',
  Member = 'member',
}

export default GroupMemberRole;
