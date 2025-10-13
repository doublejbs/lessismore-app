import ReplyStore from '../store/ReplyStore';
import { makeAutoObservable } from 'mobx';
import Comment from './Comment';
import { View } from 'react-native';

class ReplyDetail {
  public static of(gearId: string, commentId: string, replyStore: ReplyStore) {
    return new ReplyDetail(gearId, commentId, replyStore);
  }

  private replies: Comment[] = [];
  private originalComment: Comment | null = null;
  private replyTarget: Comment | null = null;
  private inputRef: View | null = null;

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
      this.setReplies(replies);
    }
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
      this.setReplies(replies);
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
}

export default ReplyDetail;
