import app from '@/model/app/App';
import CommunityPost from '@/model/community/CommunityPost';
import CommunitySearchStore from '@/model/search/CommunitySearchStore';
import CommunityStore from '@/model/store/CommunityStore';

class CommunitySearchDispatcher {
  public static new() {
    return new CommunitySearchDispatcher(
      app.getCommunitySearchStore()!,
      app.getCommunityStore()!
    );
  }

  private constructor(
    private readonly searchStore: CommunitySearchStore,
    private readonly communityStore: CommunityStore
  ) {}

  public async searchPosts(
    query: string,
    page: number
  ): Promise<{ posts: CommunityPost[]; hasMore: boolean; totalHits: number }> {
    const result = await this.searchStore.searchPosts(query, page);

    return {
      posts: await this.communityStore.getPostsByIds(result.postIds),
      hasMore: result.hasMore,
      totalHits: result.totalHits,
    };
  }
}

export default CommunitySearchDispatcher;
