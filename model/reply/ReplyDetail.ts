import ReplyStore from '../store/ReplyStore';
import { makeAutoObservable } from 'mobx';
import Comment from './Comment';
import { View } from 'react-native';
import app from '../app/App';

class ReplyDetail {
  public static of(gearId: string, commentId: string, replyStore: ReplyStore) {
    return new ReplyDetail(gearId, commentId, replyStore);
  }

  private replies: Comment[] = [];
  private originalComment: Comment | null = null;
  private replyTarget: Comment | null = null;
  private inputRef: View | null = null;
  private commentLikesMap: Map<string, boolean> = new Map();

  private constructor(
    private readonly gearId: string,
    private readonly commentId: string,
    private readonly replyStore: ReplyStore
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    const [originalComment, replies] = await Promise.all([
      this.replyStore.getComment(this.gearId, this.commentId),
      this.getAllReplies(),
    ]);

    if (originalComment) {
      this.setOriginalComment(originalComment);
    }

    if (replies) {
      const activeReplies = replies.filter(r => !r.isDeleted);
      this.setReplies(activeReplies);
    }

    await this.loadLikeStates();
  }

  private async loadLikeStates() {
    const firebase = this.replyStore.getFirebase();
    const userId = firebase.getUserId();
    if (!userId) return;

    if (this.originalComment) {
      const isLiked = await this.replyStore.isCommentLiked(
        this.originalComment.id,
        userId
      );
      this.setCommentLikesMap(this.originalComment.id, isLiked);
    }

    for (const reply of this.replies) {
      const isLiked = await this.replyStore.isCommentLiked(reply.id, userId);
      this.setCommentLikesMap(reply.id, isLiked);
    }
  }

  private setCommentLikesMap(commentId: string, isLiked: boolean) {
    this.commentLikesMap.set(commentId, isLiked);
  }

  private async getAllReplies(): Promise<Comment[]> {
    // 모든 답글이 원본 댓글 하위에 평면적으로 저장되므로 한 번만 조회
    const replies = await this.replyStore.getReplies(
      this.gearId,
      this.commentId
    );
    return replies;
  }

  private setOriginalComment(comment: Comment) {
    this.originalComment = comment;
  }

  private setReplies(replies: Comment[]) {
    this.replies = replies;
  }

  public getOriginalComment() {
    return this.originalComment;
  }

  public getReplies() {
    return this.replies;
  }

  public async createReply(content: string) {
    const firebase = this.replyStore.getFirebase();
    const authorId = firebase.getUserId();
    const authorName = firebase.getNickname();
    const currentUser = firebase.getCurrentUser();
    const authorProfileUrl = currentUser?.photoURL || undefined;

    // 항상 원본 댓글(commentId) 하위에 저장하고, parentId는 문서 관계만 표시
    const request: any = {
      content,
      parentId: this.commentId,
    };

    if (this.replyTarget?.authorName) {
      request.mentionedUserName = this.replyTarget.authorName;
      request.mentionedUserId = this.replyTarget.authorId;
    }

    await this.replyStore.createComment(
      this.gearId,
      authorId,
      authorName,
      request,
      authorProfileUrl
    );

    // 답글 목록 다시 조회
    const replies = await this.getAllReplies();
    if (replies) {
      const activeReplies = replies.filter(r => !r.isDeleted);
      this.setReplies(activeReplies);
    }

    // 답글 대상 초기화
    this.clearReplyTarget();
  }

  public setReplyTarget(comment: Comment | null) {
    this.replyTarget = comment;
    this.inputRef?.focus();
  }

  public getReplyTarget() {
    return this.replyTarget;
  }

  public clearReplyTarget() {
    this.replyTarget = null;
  }

  public setInputRef(ref: View) {
    this.inputRef = ref;
  }

  public getInputRef() {
    return this.inputRef;
  }

  public getGearId() {
    return this.gearId;
  }

  public isCommentLiked(commentId: string): boolean {
    return this.commentLikesMap.get(commentId) || false;
  }

  public async toggleLike(commentId: string) {
    const firebase = this.replyStore.getFirebase();
    const userId = firebase.getUserId();
    if (!userId) {
      app.getLogInAlertManager()?.show();
      return;
    }

    const currentLikeState = this.commentLikesMap.get(commentId) || false;
    const newLikeState = !currentLikeState;
    const likeCountDelta = newLikeState ? 1 : -1;

    // 낙관적 업데이트
    this.setCommentLikesMap(commentId, newLikeState);

    if (this.originalComment && this.originalComment.id === commentId) {
      this.originalComment = {
        ...this.originalComment,
        likeCount: this.originalComment.likeCount + likeCountDelta,
      };
    }

    const updatedReplies = this.replies.map(r =>
      r.id === commentId ? { ...r, likeCount: r.likeCount + likeCountDelta } : r
    );
    this.setReplies(updatedReplies);

    try {
      await this.replyStore.toggleCommentLike(this.gearId, commentId, userId);
    } catch (error) {
      // 실패 시 롤백
      this.setCommentLikesMap(commentId, currentLikeState);

      if (this.originalComment && this.originalComment.id === commentId) {
        this.originalComment = {
          ...this.originalComment,
          likeCount: this.originalComment.likeCount - likeCountDelta,
        };
      }

      const rolledBackReplies = this.replies.map(r =>
        r.id === commentId
          ? { ...r, likeCount: r.likeCount - likeCountDelta }
          : r
      );
      this.setReplies(rolledBackReplies);
      console.error('좋아요 토글 실패:', error); // l10n-ignore: 개발자 로그
    }
  }

  public showDeleteConfirm(commentId: string) {
    app.getAlertManager()?.show({
      message: app.getL10n().t('reply.deleteConfirm'),
      confirmText: app.getL10n().t('reply.delete'),
      onConfirm: async () => {
        try {
          await this.deleteComment(commentId);
        } catch {
          app.getAlertManager()?.show({
            message: app.getL10n().t('reply.deleteFailed'),
            confirmText: app.getL10n().t('reply.confirm'),
            onConfirm: async () => {},
          });
        }
      },
    });
  }

  private async deleteComment(commentId: string) {
    const firebase = this.replyStore.getFirebase();
    const authorId = firebase.getUserId();

    if (!authorId) {
      app.getLogInAlertManager()?.show();
      return;
    }

    await this.replyStore.deleteComment(this.gearId, commentId, authorId);

    // 원본 댓글 삭제 시
    if (this.originalComment?.id === commentId) {
      // 화면 뒤로가기 또는 목록으로 이동
      const { router } = await import('expo-router');
      router.back();
      return;
    }

    // 답글 삭제 시 목록 새로고침
    const replies = await this.getAllReplies();
    if (replies) {
      const activeReplies = replies.filter(r => !r.isDeleted);
      this.setReplies(activeReplies);
    }
  }
}

export default ReplyDetail;
