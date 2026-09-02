import { makeAutoObservable } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import app from '@/model/app/App';
import CommunityComment from '@/model/community/CommunityComment';
import CommunityCommentDeletedReason from '@/model/community/CommunityCommentDeletedReason';
import CommunityContentStatus from '@/model/community/CommunityContentStatus';
import { CommunityCommentData } from '@/model/community/CommunityData';
import CommunityError from '@/model/community/CommunityError';
import CommunityReportReason from '@/model/community/CommunityReportReason';
import CommunityReportTargetType from '@/model/community/CommunityReportTargetType';
import CommunityValidationError from '@/model/community/CommunityValidationError';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityDetailDispatcher from './CommunityDetailDispatcher';

export interface CommunityReplyTarget {
  parentId: string;
  mentionedUserId: string;
  mentionedUserName: string;
}

export interface CommunityReportTarget {
  targetType: CommunityReportTargetType;
  targetAuthorId: string;
  commentId?: string;
}

class CommunityDetail {
  public static from(router: ImperativeRouter, postId: string) {
    return new CommunityDetail(
      router,
      postId,
      new CommunityDetailDispatcher(app.getCommunityStore()!)
    );
  }

  private post: CommunityPost | null = null;
  private loading = true;
  private notFound = false;
  private error = false;
  private liked = false;
  private myVoteOptionId: string | null = null;
  private comments: CommunityComment[] = [];
  private commentsCursor: QueryDocumentSnapshot | null = null;
  private moreComments = false;
  private loadingComments = false;
  private replyTarget: CommunityReplyTarget | null = null;
  private draft = '';
  private submittingComment = false;

  private constructor(
    private readonly router: ImperativeRouter,
    private readonly postId: string,
    private readonly dispatcher: CommunityDetailDispatcher
  ) {
    makeAutoObservable(this);
  }

  public async initialize(postId: string = this.postId) {
    this.setLoading(true);
    this.setError(false);

    try {
      const [postResult, likedResult, myVoteResult, commentsResult] =
        await Promise.allSettled([
        this.dispatcher.getPost(postId),
        this.dispatcher.isLiked(postId),
        this.dispatcher.getMyVote(postId),
        this.dispatcher.getCommentsPage(postId, null),
      ]);
      const post = postResult.status === 'fulfilled' ? postResult.value : null;

      if (!post) {
        this.setPost(null);
        this.setNotFound(true);
        this.setComments([]);
        return;
      }

      if (
        likedResult.status === 'rejected' ||
        myVoteResult.status === 'rejected' ||
        commentsResult.status === 'rejected'
      ) {
        throw new Error('Community detail load failed');
      }

      this.setPost(post);
      this.setLiked(likedResult.value);
      this.setMyVoteOptionId(myVoteResult.value);
      this.setComments(commentsResult.value.comments);
      this.setCommentsCursor(commentsResult.value.cursor);
      this.setHasMoreComments(commentsResult.value.hasMore);
      this.setNotFound(false);
    } catch {
      this.setError(true);
      this.showToast('community.detail.failed');
    } finally {
      this.setLoading(false);
    }
  }

  public async refresh() {
    await this.initialize(this.postId);
  }

  public async toggleLike() {
    if (!this.requireLogin()) {
      return;
    }

    if (!this.post) {
      return;
    }

    const previous = this.liked;
    const optimistic = !previous;
    this.setLiked(optimistic);
    this.post.applyLikeToggle(optimistic);

    try {
      const liked = await this.dispatcher.toggleLike(this.postId);
      this.setLiked(liked);
      this.post.applyLikeToggle(liked);
      app.getAnalyticsManager()?.logClick('community_like', { liked });
    } catch {
      this.setLiked(previous);
      this.post.applyLikeToggle(previous);
      this.showToast('community.detail.failed');
    }
  }

  public async vote(optionId: string) {
    if (!this.requireLogin()) {
      return;
    }

    if (!this.post || !this.post.isPoll()) {
      return;
    }

    try {
      await this.dispatcher.vote(this.postId, optionId);
      this.post.applyVote(optionId);
      this.setMyVoteOptionId(optionId);
      app.getAnalyticsManager()?.logClick('community_vote');
    } catch (error) {
      if (this.isCommunityError(error, CommunityValidationError.AlreadyVoted)) {
        this.showToast('community.poll.alreadyVoted');
      } else if (
        this.isCommunityError(error, CommunityValidationError.PollExpired)
      ) {
        this.showToast('community.poll.closed');
      } else {
        this.showToast('community.detail.failed');
      }
    }
  }

  public async submitComment() {
    if (!this.requireLogin()) {
      return;
    }

    const body = this.draft.trim();

    if (!body || body.length > 1000 || this.submittingComment) {
      return;
    }

    this.setSubmittingComment(true);

    try {
      const commentId = await this.dispatcher.createComment(
        this.postId,
        body,
        this.replyTarget ?? undefined
      );
      const now = new Date();
      const commentData: CommunityCommentData = {
        id: commentId,
        status: CommunityContentStatus.Published,
        authorId: app.getFirebase().getUserId(),
        authorName: app.getFirebase().getNickname(),
        body,
        createdAt: now,
        updatedAt: now,
        ...(this.replyTarget
          ? {
              parentId: this.replyTarget.parentId,
              mentionedUserId: this.replyTarget.mentionedUserId,
              mentionedUserName: this.replyTarget.mentionedUserName,
            }
          : {}),
      };
      this.setComments(this.sortComments([...this.comments, CommunityComment.from(commentData)]));
      this.post?.applyCommentCountDelta(1);
      const depth = this.replyTarget ? 1 : 0;
      this.setDraft('');
      this.setReplyTarget(null);
      app.getAnalyticsManager()?.logClick('community_comment_submit', {
        depth: depth === 1 ? 'reply' : 'comment',
      });
    } catch {
      this.showToast('community.detail.failed');
    } finally {
      this.setSubmittingComment(false);
    }
  }

  public async loadMoreComments() {
    if (this.loadingComments || !this.moreComments) {
      return;
    }

    this.setLoadingComments(true);

    try {
      const page = await this.dispatcher.getCommentsPage(
        this.postId,
        this.commentsCursor
      );
      this.setComments(this.sortComments([...this.comments, ...page.comments]));
      this.setCommentsCursor(page.cursor);
      this.setHasMoreComments(page.hasMore);
    } catch {
      this.showToast('community.detail.failed');
    } finally {
      this.setLoadingComments(false);
    }
  }

  public startReply(comment: CommunityComment) {
    if (comment.isDeletedPlaceholder()) {
      return;
    }

    this.setReplyTarget({
      parentId: comment.getParentId() ?? comment.getId(),
      mentionedUserId: comment.getAuthorId(),
      mentionedUserName: comment.getAuthorName(),
    });
  }

  public cancelReply() {
    this.setReplyTarget(null);
  }

  public async deleteComment(commentId: string) {
    if (!this.requireLogin()) {
      return;
    }

    app.getAlertManager()?.show({
      message: app.getL10n().t('community.comment.deleteConfirm'),
      confirmText: app.getL10n().t('common.delete'),
      onConfirm: async () => {
        try {
          const hasReplies = this.comments.some(
            comment => comment.getParentId() === commentId
          );
          await this.dispatcher.deleteComment(this.postId, commentId);

          if (hasReplies) {
            const target = this.comments.find(
              comment => comment.getId() === commentId
            );

            if (target) {
              const targetParentId = target.getParentId();
              const placeholderData: CommunityCommentData = {
                id: target.getId(),
                status: CommunityContentStatus.Deleted,
                deletedReason: CommunityCommentDeletedReason.Author,
                authorId: '',
                authorName: '',
                body: '',
                createdAt: target.getCreatedAt(),
                updatedAt: new Date(),
                ...(targetParentId ? { parentId: targetParentId } : {}),
              };
              this.setComments(
                this.sortComments(
                  this.comments.map(comment =>
                    comment.getId() === commentId
                      ? CommunityComment.from(placeholderData)
                      : comment
                  )
                )
              );
            }
          } else {
            this.setComments(
              this.comments.filter(comment => comment.getId() !== commentId)
            );
          }

          this.post?.applyCommentCountDelta(-1);
        } catch {
          this.showToast('community.detail.failed');
        }
      },
    });
  }

  public deletePost() {
    if (!this.requireLogin()) {
      return;
    }

    app.getAlertManager()?.show({
      message: app.getL10n().t('community.detail.deleteConfirm'),
      confirmText: app.getL10n().t('common.delete'),
      onConfirm: async () => {
        try {
          await this.dispatcher.deletePost(this.postId);
          this.showToast('community.detail.deleted');
          this.router.back();
        } catch {
          this.showToast('community.detail.failed');
        }
      },
    });
  }

  public async report(target: CommunityReportTarget, reason: CommunityReportReason) {
    if (!this.requireLogin()) {
      return;
    }

    try {
      await this.dispatcher.report({
        targetType: target.targetType,
        postId: this.postId,
        targetAuthorId: target.targetAuthorId,
        reason,
        ...(target.commentId ? { commentId: target.commentId } : {}),
      });
      app.getToastManager()?.show({
        message: app.getL10n().t('community.report.done'),
      });
      app.getAnalyticsManager()?.logClick('community_report', {
        target: target.targetType,
      });
    } catch {
      this.showToast('community.report.failed');
    }
  }

  public setDraft(value: string) {
    this.draft = value;
  }

  public getPost() {
    return this.post;
  }

  public isLoading() {
    return this.loading;
  }

  public isNotFound() {
    return this.notFound;
  }

  public hasError() {
    return this.error;
  }

  public isLiked() {
    return this.liked;
  }

  public getMyVoteOptionId() {
    return this.myVoteOptionId;
  }

  public getComments() {
    return this.comments;
  }

  public hasMoreCommentsPage() {
    return this.moreComments;
  }

  public hasMoreComments() {
    return this.moreComments;
  }

  public getCommentsCursor() {
    return this.commentsCursor;
  }

  public isLoadingComments() {
    return this.loadingComments;
  }

  public getReplyTarget() {
    return this.replyTarget;
  }

  public getDraft() {
    return this.draft;
  }

  public isSubmittingComment() {
    return this.submittingComment;
  }

  private requireLogin() {
    if (app.getFirebase().isLoggedIn()) {
      return true;
    }

    app.getLogInAlertManager()?.show();

    return false;
  }

  private showToast(key: string) {
    app.getToastManager()?.show({ message: app.getL10n().t(key) });
  }

  private isCommunityError(error: unknown, code: CommunityValidationError) {
    return error instanceof CommunityError && error.code === code;
  }

  private sortComments(comments: CommunityComment[]) {
    const roots = comments
      .filter(comment => !comment.isReply())
      .sort((left, right) => left.getCreatedAt().getTime() - right.getCreatedAt().getTime());
    const replies = comments.filter(comment => comment.isReply());
    const sorted: CommunityComment[] = [];

    roots.forEach(root => {
      sorted.push(root);
      replies
        .filter(reply => reply.getParentId() === root.getId())
        .sort((left, right) => left.getCreatedAt().getTime() - right.getCreatedAt().getTime())
        .forEach(reply => sorted.push(reply));
    });

    replies
      .filter(reply => !roots.some(root => root.getId() === reply.getParentId()))
      .forEach(reply => sorted.push(reply));

    return sorted;
  }

  private setPost(value: CommunityPost | null) {
    this.post = value;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setNotFound(value: boolean) {
    this.notFound = value;
  }

  private setError(value: boolean) {
    this.error = value;
  }

  private setLiked(value: boolean) {
    this.liked = value;
  }

  private setMyVoteOptionId(value: string | null) {
    this.myVoteOptionId = value;
  }

  private setComments(value: CommunityComment[]) {
    this.comments = value;
  }

  private setCommentsCursor(value: QueryDocumentSnapshot | null) {
    this.commentsCursor = value;
  }

  private setHasMoreComments(value: boolean) {
    this.moreComments = value;
  }

  private setLoadingComments(value: boolean) {
    this.loadingComments = value;
  }

  private setReplyTarget(value: CommunityReplyTarget | null) {
    this.replyTarget = value;
  }

  private setSubmittingComment(value: boolean) {
    this.submittingComment = value;
  }
}

export default CommunityDetail;
