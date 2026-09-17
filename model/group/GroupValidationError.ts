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
  OwnerCannotLeave = 'owner_cannot_leave',
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
