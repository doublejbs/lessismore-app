enum CommunityReportReason {
  Spam = 'spam',
  Harassment = 'harassment',
  SexualViolence = 'sexual_violence',
  Copyright = 'copyright',
  Privacy = 'privacy',
  Other = 'other',
  // `user` 신고 전용 — 사용자 차단 시 운영자 알림(CM-17).
  Blocked = 'blocked',
}

export default CommunityReportReason;
