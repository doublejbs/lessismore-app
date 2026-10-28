enum CommunityReportTargetType {
  Post = 'post',
  Comment = 'comment',
  // 장비·배낭 댓글(CM-10, DM-28) — targetPostId=장비 id, targetCommentId=댓글 id.
  GearComment = 'gear_comment',
  // 박지 이용자 후기(CM-10, DM-28) — targetPostId=박지 id, targetCommentId=작성자 uid(후기 문서 id).
  CampReview = 'camp_review',
  // 사용자 차단 알림(CM-17) — targetId=차단 uid.
  User = 'user',
}

export default CommunityReportTargetType;
