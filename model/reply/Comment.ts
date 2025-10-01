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
}

interface GearCommentSummary {
  readonly gearId: string;
  readonly totalCount: number;
  readonly parentCount: number;
  readonly lastCommentAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface CommentCreateRequest {
  readonly content: string;
  readonly parentId?: string;
}

interface CommentUpdateRequest {
  readonly content: string;
}

export default Comment;
export { GearCommentSummary, CommentCreateRequest, CommentUpdateRequest };
