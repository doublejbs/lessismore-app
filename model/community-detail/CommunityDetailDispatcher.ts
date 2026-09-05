import { QueryDocumentSnapshot } from 'firebase/firestore';
import CommunityComment from '@/model/community/CommunityComment';
import { CommunityReportInput } from '@/model/community/CommunityData';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityStore from '@/model/store/CommunityStore';
import CampSpotStore from '@/model/store/CampSpotStore';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

class CommunityDetailDispatcher {
  public constructor(
    private readonly store: CommunityStore,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public getPost(postId: string): Promise<CommunityPost | null> {
    return this.store.getPost(postId);
  }

  public getCampSpot(id: string): Promise<CampSpot | null> {
    return this.campSpotStore.getSpot(id);
  }

  public isLiked(postId: string): Promise<boolean> {
    return this.store.isLiked(postId);
  }

  public getMyVote(postId: string): Promise<string[]> {
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

  public updateComment(postId: string, commentId: string, body: string) {
    return this.store.updateComment(postId, commentId, body);
  }

  public deletePost(postId: string) {
    return this.store.deletePost(postId);
  }

  public report(input: CommunityReportInput) {
    return this.store.report(input);
  }
}

export default CommunityDetailDispatcher;
