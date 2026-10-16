import CommunityContentStatus from './CommunityContentStatus';
import CommunityCommentDeletedReason from './CommunityCommentDeletedReason';
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
  gearId?: string;
  company: string;
  name: string;
  weight: number;
  category: string;
}

export interface CommunityBagSnapshotWeatherDay {
  date: string;
  code: number;
  tempMax: number;
  tempMin: number;
}

export interface CommunityBagSnapshotWeather {
  locationName?: string;
  days: CommunityBagSnapshotWeatherDay[];
}

export interface CommunityBagSnapshot {
  name: string;
  startDate?: string;
  endDate?: string;
  destinationName?: string;
  campSpotId?: string;
  weather?: CommunityBagSnapshotWeather;
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
  allowMultiple: boolean;
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
  deletedReason?: CommunityCommentDeletedReason;
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
  hasBagSnapshot: boolean;
  hasPoll: boolean;
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
  allowMultiple: boolean;
  expiresAt?: Date;
}

export interface CommunityPostPatch {
  hasBagSnapshot?: boolean;
  hasPoll?: boolean;
  title?: string;
  body?: string;
  images?: CommunityPostImage[];
  bagSnapshot?: CommunityBagSnapshot | null;
  poll?: CommunityPollPatch | null;
}

export interface CommunityPollPatch {
  options?: CommunityPollInputOption[];
  allowMultiple?: boolean;
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
  optionIds: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface CommunityReportInput {
  targetType: CommunityReportTargetType;
  postId: string;
  commentId?: string;
  targetAuthorId: string;
  reason: CommunityReportReason;
  detail?: string;
  // 같은 대상을 다시 알려야 할 때 문서 ID 끝에 붙인다(차단 → 해제 → 재차단 시 운영자 재알림, CM-17).
  reportIdSuffix?: string;
}

export interface CommunityReportData {
  reporterId: string;
  targetType: CommunityReportTargetType;
  // 사용자 차단(`user`)은 차단한 자리를 모르면 비운다(DM-28).
  targetPostId?: string;
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
