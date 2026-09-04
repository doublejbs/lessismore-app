import { SearchResponse } from 'algoliasearch';
import { liteClient } from 'algoliasearch/lite';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY } from './AlgoliaConfig';

interface CommunityPostSearchHit {
  objectID: string;
}

class CommunitySearchStore {
  private readonly searchClient = liteClient(
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY
  );

  public async searchPosts(
    query: string,
    page: number
  ): Promise<{ postIds: string[]; hasMore: boolean; totalHits: number }> {
    const { results } = await this.searchClient.search<CommunityPostSearchHit>({
      requests: [
        {
          indexName: 'useless-community-posts',
          query,
          page,
          hitsPerPage: 20,
          filters: 'status:published',
          attributesToRetrieve: ['objectID'],
        },
      ],
    });
    const response = results[0] as SearchResponse<CommunityPostSearchHit>;

    return {
      postIds: response.hits.map(hit => hit.objectID),
      hasMore: (response.page ?? page) + 1 < (response.nbPages ?? 0),
      totalHits: response.nbHits ?? 0,
    };
  }
}

export default CommunitySearchStore;
