import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import CampSpotStore from './CampSpotStore';
import FeedContentType from '../feed/FeedContentType';
import { FeedContentData, RecommendedSpot } from '../feed/FeedContentTypes';

// 홈 운영자 추천 박지 조회·참조 조인 (Home HM-11, DataModel DM-27).
class FeedContentStore {
  // 큐레이션은 소량이며, 초안이 최신 30건을 잠식할 수 있어 50건을 넉넉히 읽고 발행 여부를 거른다.
  private static readonly PUBLISHED_CONTENT_LIMIT = 50;
  public static readonly SPOT_LIMIT = 5;

  public constructor(
    private readonly firebase: Firebase,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public async getRecommendedSpots(): Promise<RecommendedSpot[]> {
    const contents = (await this.getPublishedContents())
      .filter(content => content.type === FeedContentType.SpotIntro)
      .slice(0, FeedContentStore.SPOT_LIMIT);

    const joined = await Promise.all(
      contents.map(async content => {
        if (!content.relatedSpotId) {
          return null;
        }

        const spot = await this.campSpotStore.getSpot(content.relatedSpotId);

        if (!spot) {
          return null;
        }

        return { content, spot };
      })
    );

    return joined.filter(
      (item): item is RecommendedSpot => item !== null
    );
  }

  private async getPublishedContents(): Promise<FeedContentData[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(this.firebase.getStore(), 'feed-content'),
          orderBy('publishedAt', 'desc'),
          limit(FeedContentStore.PUBLISHED_CONTENT_LIMIT)
        )
      );

      return snapshot.docs
        .map(document => document.data() as FeedContentData)
        .filter(content => content.published === true);
    } catch (error) {
      console.error('홈 추천 콘텐츠 조회 실패:', error);

      return [];
    }
  }
}

export default FeedContentStore;
