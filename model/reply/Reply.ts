import { router } from 'expo-router';
import Firebase from '../firebase/Firebase';
import ReplyStore from '../store/ReplyStore';
import Comment, { CommentCreateRequest } from './Comment';
import { makeAutoObservable } from 'mobx';
import app from '../app/App';

class Reply {
  public static of(gearId: string, firebase: Firebase, replyStore: ReplyStore) {
    return new Reply(gearId, firebase, replyStore);
  }

  private comments: Comment[] = [];
  private commentLikesMap: Map<string, boolean> = new Map();

  private constructor(
    private readonly gearId: string,
    private readonly firebase: Firebase,
    private readonly replyStore: ReplyStore
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    const data = await this.replyStore.getParentComments(this.gearId);

    if (data.comments) {
      const activeComments = data.comments.filter(c => !c.isDeleted);
      this.setComments(activeComments);
      await this.loadLikeStates();
    }
  }

  private async loadLikeStates() {
    const userId = this.firebase.getUserId();
    if (!userId) return;

    for (const comment of this.comments) {
      const isLiked = await this.replyStore.isCommentLiked(comment.id, userId);
      this.setCommentLikesMap(comment.id, isLiked);
    }
  }

  private setCommentLikesMap(commentId: string, isLiked: boolean) {
    this.commentLikesMap.set(commentId, isLiked);
  }

  public getGearId() {
    return this.gearId;
  }

  public async confirm(content: string, rating: number) {
    try {
      const userId = this.firebase.getUserId();
      if (!userId) {
        throw new Error('로그인이 필요합니다.');
      }

      const nickname = this.getNickname();
      if (!nickname) {
        throw new Error('닉네임이 필요합니다.');
      }

      // 별점은 유효할 때만 request에 포함(Firestore는 undefined 거부).
      const request: CommentCreateRequest = {
        content,
        ...(rating ? { rating } : {}),
      };

      await this.replyStore.createComment(
        this.gearId,
        userId,
        nickname,
        request
      );

      router.back();
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      throw error;
    }
  }

  public async moveToInput() {
    await this.firebase.createNickname();
    router.push(`/reply/${this.gearId}/input`);
  }

  public getNickname() {
    return this.firebase.getNickname();
  }

  private setComments(comments: Comment[]) {
    this.comments = comments;
  }

  public getComments() {
    return this.comments;
  }

  public getCount() {
    return this.comments.length;
  }

  public isCommentLiked(commentId: string): boolean {
    return this.commentLikesMap.get(commentId) || false;
  }

  public async toggleLike(commentId: string) {
    const userId = this.firebase.getUserId();
    if (!userId) {
      app.getLogInAlertManager()?.show();
      return;
    }

    const comment = this.comments.find(c => c.id === commentId);
    if (!comment) return;

    const currentLikeState = this.commentLikesMap.get(commentId) || false;
    const newLikeState = !currentLikeState;
    const likeCountDelta = newLikeState ? 1 : -1;

    // 낙관적 업데이트
    this.commentLikesMap.set(commentId, newLikeState);
    const updatedComments = this.comments.map(c =>
      c.id === commentId ? { ...c, likeCount: c.likeCount + likeCountDelta } : c
    );
    this.setComments(updatedComments);

    try {
      await this.replyStore.toggleCommentLike(this.gearId, commentId, userId);
    } catch (error) {
      // 실패 시 롤백
      this.commentLikesMap.set(commentId, currentLikeState);
      const rolledBackComments = this.comments.map(c =>
        c.id === commentId
          ? { ...c, likeCount: c.likeCount - likeCountDelta }
          : c
      );
      this.setComments(rolledBackComments);
      console.error('좋아요 토글 실패:', error);
    }
  }

  public showDeleteConfirm(commentId: string) {
    app.getAlertManager()?.show({
      message: '정말 삭제하시겠습니까?',
      confirmText: '삭제',
      failureMessage: '삭제하지 못했어요. 다시 시도해주세요.',
      onConfirm: async () => this.deleteComment(commentId),
    });
  }

  private async deleteComment(commentId: string) {
    const userId = this.firebase.getUserId();

    if (!userId) {
      app.getLogInAlertManager()?.show();
      return;
    }

    await this.replyStore.deleteComment(this.gearId, commentId, userId);

    // 댓글 목록 새로고침
    const data = await this.replyStore.getParentComments(this.gearId);
    if (data.comments) {
      const activeComments = data.comments.filter(c => !c.isDeleted);
      this.setComments(activeComments);
      await this.loadLikeStates();
    }
  }
}

export default Reply;
