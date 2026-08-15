import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { makeAutoObservable } from 'mobx';
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
  public static readonly SPOT_LIMIT = 3;
  public static readonly GEAR_LIMIT = 10;

  public constructor(
    private readonly firebase: Firebase,
    private readonly campSpotStore: CampSpotStore,
    private readonly gearStore: GearStore
  ) {
    makeAutoObservable(this);
  }

  public async getRecommendedSpots(): Promise<RecommendedSpot[]> {
    const contents = await this.getPublishedContents(
      FeedContentType.SpotIntro,
      FeedContentStore.SPOT_LIMIT
    );

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
    const contents = await this.getPublishedContents(
      FeedContentType.GearIntro,
      FeedContentStore.GEAR_LIMIT
    );

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

  private async getPublishedContents(
    type: FeedContentType,
    count: number
  ): Promise<FeedContentData[]> {
    const snapshot = await getDocs(
      query(
        collection(this.firebase.getStore(), 'feed-content'),
        where('published', '==', true),
        where('type', '==', type),
        orderBy('publishedAt', 'desc'),
        limit(count)
      )
    );

    return snapshot.docs.map(document => document.data() as FeedContentData);
  }
}

export default FeedContentStore;
