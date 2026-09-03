import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import app from '@/model/app/App';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import CommunityFeedSort from '@/model/community/CommunityFeedSort';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityStore from '@/model/store/CommunityStore';

interface CommunityFeedPage {
  posts: CommunityPost[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

class CommunityFeedDispatcher {
  public static new() {
    return new CommunityFeedDispatcher(app.getCommunityStore()!);
  }

  private constructor(private readonly store: CommunityStore) {}

  public async getPage(
    filter: CommunityFeedFilter,
    sort: CommunityFeedSort,
    cursor: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<CommunityFeedPage> {
    return await this.store.getFeedPage(filter, sort, cursor);
  }
}

export default CommunityFeedDispatcher;
