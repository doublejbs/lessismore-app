enum CommunityValidationError {
  TitleLength = 'title_length',
  BodyLength = 'body_length',
  PollOptionCount = 'poll_option_count',
  PollOptionLength = 'poll_option_length',
  PollOptionDuplicate = 'poll_option_duplicate',
  PollOptionInvalid = 'poll_option_invalid',
  BagSnapshotRequired = 'bag_snapshot_required',
  PollRequired = 'poll_required',
  ImageCount = 'image_count',
  CommentLength = 'comment_length',
  NotLoggedIn = 'not_logged_in',
  PollExpired = 'poll_expired',
  PollLocked = 'poll_locked',
  PostNotFound = 'post_not_found',
  CommentNotFound = 'comment_not_found',
  Forbidden = 'forbidden',
  ReportTargetInvalid = 'report_target_invalid',
  AttachmentMismatch = 'attachment_mismatch',
}

export default CommunityValidationError;
