import { router } from 'expo-router';
import Firebase from '../firebase/Firebase';
import ReplyStore from '../store/ReplyStore';
import { CommentCreateRequest } from './Comment';
import Comment from './Comment';
import { makeAutoObservable } from 'mobx';

class Reply {
  public static of(gearId: string, firebase: Firebase, replyStore: ReplyStore) {
    return new Reply(gearId, firebase, replyStore);
  }

  private comments: Comment[] = [];

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
      this.setComments(data.comments);
    }
  }

  public getGearId() {
    return this.gearId;
  }

  public async confirm(content: string) {
    try {
      const userId = this.firebase.getUserId();
      if (!userId) {
        throw new Error('로그인이 필요합니다.');
      }

      const nickname = this.getNickname();
      if (!nickname) {
        throw new Error('닉네임이 필요합니다.');
      }

      const request: CommentCreateRequest = {
        content,
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
}

export default Reply;
