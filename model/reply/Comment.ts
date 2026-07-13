interface Comment {
  readonly id: string;
  readonly content: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly authorProfileUrl?: string;
  readonly parentId?: string;
  readonly depth: number;
  readonly isDeleted: boolean;
  readonly likeCount: number;
  readonly replyCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
  readonly mentionedUserName?: string;
  readonly mentionedUserId?: string;
  // 별점 — 최상위 댓글(parentId==null, depth 0)만 가진다. 답글·레거시 댓글엔 없음.
  readonly rating?: number;
}

interface GearCommentSummary {
  readonly gearId: string;
  readonly totalCount: number;
  readonly parentCount: number;
  readonly lastCommentAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  // 별점 집계 — 별점 있는 최상위 댓글 기준.
  readonly ratingSum: number;
  readonly ratingCount: number;
  readonly ratingAvg: number;
}

interface CommentCreateRequest {
  readonly content: string;
  readonly parentId?: string;
  readonly mentionedUserName?: string;
  readonly mentionedUserId?: string;
  readonly rating?: number;
}

interface CommentUpdateRequest {
  readonly content: string;
  readonly rating?: number;
}

export default Comment;
export { GearCommentSummary, CommentCreateRequest, CommentUpdateRequest };
