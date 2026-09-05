import { makeAutoObservable } from 'mobx';
import CommunityContentStatus from './CommunityContentStatus';
import {
  CommunityBagSnapshot,
  CommunityPoll,
  CommunityPostData,
  CommunityPostImage,
  toDate,
} from './CommunityData';
import CommunityPostType from './CommunityPostType';

class CommunityPost {
  private readonly id: string;
  private readonly type: CommunityPostType;
  private readonly status: CommunityContentStatus;
  private readonly authorId: string;
  private readonly authorName: string;
  private readonly title: string;
  private readonly body: string;
  private readonly images: CommunityPostImage[];
  private readonly bagSnapshot: CommunityBagSnapshot | undefined;
  private poll: CommunityPoll | undefined;
  private likeCount: number;
  private commentCount: number;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  public static from(data: CommunityPostData) {
    return new CommunityPost(data);
  }

  public constructor(data: CommunityPostData) {
    this.id = data.id;
    this.type = data.type;
    this.status = data.status;
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.title = data.title;
    this.body = data.body;
    this.images = data.images.map(image => ({ ...image }));
    this.bagSnapshot = data.bagSnapshot
      ? {
          ...data.bagSnapshot,
          gears: data.bagSnapshot.gears.map(gear => ({ ...gear })),
        }
      : undefined;
    this.poll = data.poll
      ? {
          options: data.poll.options.map(option => ({ ...option })),
          totalVoteCount: data.poll.totalVoteCount,
          ...(data.poll.expiresAt
            ? { expiresAt: toDate(data.poll.expiresAt) }
            : {}),
        }
      : undefined;
    this.likeCount = data.likeCount;
    this.commentCount = data.commentCount;
    this.createdAt = toDate(data.createdAt);
    this.updatedAt = toDate(data.updatedAt);

    makeAutoObservable(this);
  }

  public getId() {
    return this.id;
  }

  public getType() {
    return this.type;
  }

  public getStatus() {
    return this.status;
  }

  public getAuthorId() {
    return this.authorId;
  }

  public getAuthorName() {
    return this.authorName;
  }

  public getTitle() {
    return this.title;
  }

  public getBody() {
    return this.body;
  }

  public getImages() {
    return this.images;
  }

  public getBagSnapshot() {
    return this.bagSnapshot;
  }

  public getPoll() {
    return this.poll;
  }

  public getLikeCount() {
    return this.likeCount;
  }

  public getCommentCount() {
    return this.commentCount;
  }

  public getCreatedAt() {
    return this.createdAt;
  }

  public getUpdatedAt() {
    return this.updatedAt;
  }

  public isPoll() {
    return this.hasPoll();
  }

  public isBagReview() {
    return this.hasBagSnapshot();
  }

  public hasBagSnapshot() {
    return !!this.bagSnapshot;
  }

  public hasPoll() {
    return !!this.poll;
  }

  public isPollExpired(now: Date = new Date()) {
    return Boolean(this.poll?.expiresAt && this.poll.expiresAt <= now);
  }

  public canEditPollStructure() {
    return this.hasPoll() && (this.poll?.totalVoteCount ?? 0) === 0;
  }

  public getRepresentativeImage() {
    return this.images[0] ?? null;
  }

  public getBodyPreview(maxLen: number) {
    if (maxLen <= 0) {
      return '';
    }

    if (this.body.length <= maxLen) {
      return this.body;
    }

    if (maxLen === 1) {
      return '…';
    }

    return `${this.body.slice(0, maxLen - 1)}…`;
  }

  public applyLikeCountDelta(delta: number) {
    this.setLikeCount(Math.max(0, this.likeCount + delta));
  }

  public applyVote(optionId: string, previousOptionId: string | null = null) {
    if (!this.poll) {
      return;
    }

    const option = this.poll.options.find(item => item.id === optionId);

    if (!option) {
      return;
    }

    if (previousOptionId === optionId) {
      return;
    }

    const previousOption = previousOptionId
      ? this.poll.options.find(item => item.id === previousOptionId)
      : null;
    const options = this.poll.options.map(item => {
      if (item.id === previousOptionId && previousOption) {
        return { ...item, voteCount: Math.max(0, item.voteCount - 1) };
      }

      if (item.id === optionId) {
        return { ...item, voteCount: item.voteCount + 1 };
      }

      return item;
    });
    this.setPoll({
      ...this.poll,
      options,
      totalVoteCount: previousOption ? this.poll.totalVoteCount : this.poll.totalVoteCount + 1,
    });
  }

  public rollbackVote(optionId: string, previousOptionId: string | null = null) {
    if (!this.poll || previousOptionId === optionId) {
      return;
    }

    const option = this.poll.options.find(item => item.id === optionId);

    if (!option) {
      return;
    }

    const previousOption = previousOptionId
      ? this.poll.options.find(item => item.id === previousOptionId)
      : null;
    const options = this.poll.options.map(item => {
      if (item.id === optionId) {
        return { ...item, voteCount: Math.max(0, item.voteCount - 1) };
      }

      if (item.id === previousOptionId && previousOption) {
        return { ...item, voteCount: item.voteCount + 1 };
      }

      return item;
    });
    this.setPoll({
      ...this.poll,
      options,
      totalVoteCount: previousOption
        ? this.poll.totalVoteCount
        : Math.max(0, this.poll.totalVoteCount - 1),
    });
  }

  public applyCommentCountDelta(delta: number) {
    this.setCommentCount(Math.max(0, this.commentCount + delta));
  }

  private setLikeCount(value: number) {
    this.likeCount = value;
  }

  private setPoll(value: CommunityPoll | undefined) {
    this.poll = value;
  }

  private setCommentCount(value: number) {
    this.commentCount = value;
  }
}

export default CommunityPost;
