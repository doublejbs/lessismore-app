import { makeAutoObservable } from 'mobx';
import {
  CommunityCommentData,
  toDate,
} from './CommunityData';
import CommunityContentStatus from './CommunityContentStatus';

class CommunityComment {
  private readonly id: string;
  private readonly status: CommunityContentStatus;
  private readonly authorId: string;
  private readonly authorName: string;
  private readonly body: string;
  private readonly parentId: string | undefined;
  private readonly mentionedUserId: string | undefined;
  private readonly mentionedUserName: string | undefined;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  public static from(data: CommunityCommentData) {
    return new CommunityComment(data);
  }

  public constructor(data: CommunityCommentData) {
    this.id = data.id;
    this.status = data.status;
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.body = data.body;
    this.parentId = data.parentId;
    this.mentionedUserId = data.mentionedUserId;
    this.mentionedUserName = data.mentionedUserName;
    this.createdAt = toDate(data.createdAt);
    this.updatedAt = toDate(data.updatedAt);

    makeAutoObservable(this);
  }

  public getId() {
    return this.id;
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

  public getBody() {
    return this.body;
  }

  public getParentId() {
    return this.parentId;
  }

  public getMentionedUserId() {
    return this.mentionedUserId;
  }

  public getMentionedUserName() {
    return this.mentionedUserName;
  }

  public getCreatedAt() {
    return this.createdAt;
  }

  public getUpdatedAt() {
    return this.updatedAt;
  }

  public isDeletedPlaceholder() {
    return this.status === CommunityContentStatus.Deleted;
  }

  public isReply() {
    return Boolean(this.parentId);
  }
}

export default CommunityComment;
