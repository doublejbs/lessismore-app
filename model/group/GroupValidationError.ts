// 그룹 도메인의 실패 코드 (GRP-2~GRP-9).
// 화면은 이 코드를 l10n 키에 매핑해 문구를 붙인다 — 이 파일에는 사용자 문구를 두지 않는다.
enum GroupValidationError {
  NotLoggedIn = 'not_logged_in',
  NameLength = 'name_length',
  DateRange = 'date_range',
  DateTooLong = 'date_too_long',
  GroupFull = 'group_full',
  GroupLimitExceeded = 'group_limit_exceeded',
  InviteDisabled = 'invite_disabled',
  NotMember = 'not_member',
  NotOwner = 'not_owner',
  // 작성자도 방장도 아니라 포인트·코스를 수정·삭제할 수 없다(GRP-4). NotOwner(방장 아님)와 다르다.
  NotAuthor = 'not_author',
  OwnerCannotLeave = 'owner_cannot_leave',
  // 방장은 내보내기 대상이 될 수 없다. "나갈 수 없다"(OwnerCannotLeave)와 상황이 다르다.
  OwnerCannotBeRemoved = 'owner_cannot_be_removed',
  AlreadyMember = 'already_member',
  GroupNotFound = 'group_not_found',
  MemberNotFound = 'member_not_found',
  BagNotFound = 'bag_not_found',
  PointNotFound = 'point_not_found',
  RouteNotFound = 'route_not_found',
  PointLimitExceeded = 'point_limit_exceeded',
  PointTitleLength = 'point_title_length',
  PointDescriptionLength = 'point_description_length',
  RouteLimitExceeded = 'route_limit_exceeded',
  RouteFileTooLarge = 'route_file_too_large',
  RouteParseFailed = 'route_parse_failed',
  MeetingNoteLength = 'meeting_note_length',
}

export default GroupValidationError;
