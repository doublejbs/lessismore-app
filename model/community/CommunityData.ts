import CommunityContentStatus from './CommunityContentStatus';
import CommunityPostType from './CommunityPostType';
import CommunityReportReason from './CommunityReportReason';
import CommunityReportStatus from './CommunityReportStatus';
import CommunityReportTargetType from './CommunityReportTargetType';

export interface CommunityPostImage {
  id: string;
  url: string;
  storagePath: string;
  width: number;
  height: number;
}

export interface CommunityBagSnapshotGear {
  company: string;
  name: string;
  weight: number;
  category: string;
}

export interface CommunityBagSnapshot {
  name: string;
  startDate?: string;
  endDate?: string;
  destinationName?: string;
  totalWeight: number;
  itemCount: number;
  gears: CommunityBagSnapshotGear[];
}

export interface CommunityPollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface CommunityPoll {
  options: CommunityPollOption[];
  totalVoteCount: number;
  expiresAt?: Date;
}

export interface CommunityPostData {
  id: string;
  type: CommunityPostType;
  status: CommunityContentStatus;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  images: CommunityPostImage[];
  bagSnapshot?: CommunityBagSnapshot;
  poll?: CommunityPoll;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityCommentData {
  id: string;
  status: CommunityContentStatus;
  authorId: string;
  authorName: string;
  body: string;
  parentId?: string;
  mentionedUserId?: string;
  mentionedUserName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityPostCreateInput {
  type: CommunityPostType;
  title: string;
  body: string;
  images: CommunityPostImage[];
  bagSnapshot?: CommunityBagSnapshot;
  poll?: CommunityPollInput;
  postId?: string;
}

export interface CommunityPollInputOption {
  id?: string;
  text: string;
  voteCount?: number;
}

export interface CommunityPollInput {
  options: CommunityPollInputOption[];
  expiresAt?: Date;
}

export interface CommunityPostPatch {
  title?: string;
  body?: string;
  images?: CommunityPostImage[];
  bagSnapshot?: CommunityBagSnapshot;
  poll?: CommunityPollPatch;
}

export interface CommunityPollPatch {
  options?: CommunityPollInputOption[];
  expiresAt?: Date | null;
}

export interface CommunityLikeData {
  userId: string;
  postId: string;
  createdAt: Date;
}

export interface CommunityPollVoteData {
  postId: string;
  userId: string;
  optionId: string;
  createdAt: Date;
}

export interface CommunityReportInput {
  targetType: CommunityReportTargetType;
  postId: string;
  commentId?: string;
  targetAuthorId: string;
  reason: CommunityReportReason;
  detail?: string;
}

export interface CommunityReportData {
  reporterId: string;
  targetType: CommunityReportTargetType;
  targetPostId: string;
  targetCommentId?: string;
  targetAuthorId: string;
  reason: CommunityReportReason;
  detail?: string;
  status: CommunityReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate() as Date;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return new Date(value);
  }

  return new Date(0);
};
