import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import CampSpotStore from './CampSpotStore';
import GearStore from './GearStore';
import FeedContentType from '../feed/FeedContentType';
import {
  FeedContentData,
  RecommendedGear,
  RecommendedSpot,
} from '../feed/FeedContentTypes';

// 홈 운영자 추천 조회·참조 조인 (Home HM-11·HM-12, DataModel DM-27).
class FeedContentStore {
  private static readonly PUBLISHED_CONTENT_LIMIT = 30;
  public static readonly SPOT_LIMIT = 3;
  public static readonly GEAR_LIMIT = 10;

  public constructor(
    private readonly firebase: Firebase,
    private readonly campSpotStore: CampSpotStore,
    private readonly gearStore: GearStore
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

  public async getRecommendedGears(): Promise<RecommendedGear[]> {
    const contents = (await this.getPublishedContents())
      .filter(content => content.type === FeedContentType.GearIntro)
      .slice(0, FeedContentStore.GEAR_LIMIT);

    const joined = await Promise.all(
      contents.map(async content => {
        if (!content.relatedGearId) {
          return null;
        }

        const gear = await this.gearStore.getCatalogGear(content.relatedGearId);

        if (!gear) {
          return null;
        }

        return { content, gear };
      })
    );

    return joined.filter(
      (item): item is RecommendedGear => item !== null
    );
  }

  private async getPublishedContents(): Promise<FeedContentData[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(this.firebase.getStore(), 'feed-content'),
          where('published', '==', true),
          orderBy('publishedAt', 'desc'),
          limit(FeedContentStore.PUBLISHED_CONTENT_LIMIT)
        )
      );

      return snapshot.docs.map(document => document.data() as FeedContentData);
    } catch (error) {
      console.error('홈 추천 콘텐츠 조회 실패:', error);

      return [];
    }
  }
}

export default FeedContentStore;
