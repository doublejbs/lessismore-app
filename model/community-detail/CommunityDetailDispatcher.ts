import { QueryDocumentSnapshot } from 'firebase/firestore';
import CommunityComment from '@/model/community/CommunityComment';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import {
  CommunityPostPatch,
  CommunityReportInput,
} from '@/model/community/CommunityData';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityStore from '@/model/store/CommunityStore';

class CommunityDetailDispatcher {
  public constructor(private readonly store: CommunityStore) {}

  public getPost(postId: string): Promise<CommunityPost | null> {
    return this.store.getPost(postId);
  }

  public isLiked(postId: string): Promise<boolean> {
    return this.store.isLiked(postId);
  }

  public getMyVote(postId: string): Promise<string | null> {
    return this.store.getMyVote(postId);
  }

  public getCommentsPage(
    postId: string,
    cursor: QueryDocumentSnapshot | null
  ): Promise<{
    comments: CommunityComment[];
    cursor: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }> {
    return this.store.getCommentsPage(postId, cursor);
  }

  public toggleLike(postId: string): Promise<boolean> {
    return this.store.toggleLike(postId);
  }

  public vote(postId: string, optionId: string) {
    return this.store.vote(postId, optionId);
  }

  public createComment(
    postId: string,
    body: string,
    parent?: {
      parentId: string;
      mentionedUserId: string;
      mentionedUserName: string;
    }
  ) {
    return this.store.createComment(postId, body, parent);
  }

  public deleteComment(postId: string, commentId: string) {
    return this.store.deleteComment(postId, commentId);
  }

  public deletePost(postId: string) {
    return this.store.deletePost(postId);
  }

  public updatePost(postId: string, patch: CommunityPostPatch) {
    return this.store.updatePost(postId, patch);
  }

  public report(input: CommunityReportInput) {
    return this.store.report(input);
  }

  public getFeedPage(
    filter: CommunityFeedFilter,
    cursor: QueryDocumentSnapshot | null
  ) {
    return this.store.getFeedPage(filter, cursor);
  }
}

export default CommunityDetailDispatcher;
