// 차단한 자리(CM-17, DM-38 `surface`). 계측 `click_block_user`의 `surface` 파라미터와 같은 값이다.
enum BlockSurface {
  CommunityPost = 'community_post',
  CommunityComment = 'community_comment',
  GearComment = 'gear_comment',
  CampReview = 'camp_review',
}

export default BlockSurface;
