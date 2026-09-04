import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import app from '@/model/app/App';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityStore from '@/model/store/CommunityStore';

interface CommunityMyPostsPage {
  posts: CommunityPost[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

class CommunityMyPostsDispatcher {
  public static new() {
    return new CommunityMyPostsDispatcher(app.getCommunityStore()!);
  }

  private constructor(private readonly store: CommunityStore) {}

  public async getPage(
    userId: string,
    cursor: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<CommunityMyPostsPage> {
    return await this.store.getMyPostsPage(userId, cursor);
  }
}

export default CommunityMyPostsDispatcher;
