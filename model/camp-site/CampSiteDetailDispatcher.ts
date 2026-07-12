import app from '../app/App';
import CampSpotStore from '../store/CampSpotStore';
import BagStore from '../store/BagStore';
import BagItem from '../bag/BagItem';
import reviewSearchService from '../review/ReviewSearchService';
import { CampSpot } from './CampSpotTypes';
import {
  BlogReview,
  ReviewCache,
  VideoReview,
} from '../review/ReviewTypes';
import { BagLocation } from '../weather/WeatherTypes';

// 박지 상세(CampSite CS-3/CS-5)의 데이터 접근을 캡슐화한다.
class CampSiteDetailDispatcher {
  public static new() {
    return new CampSiteDetailDispatcher(
      app.getCampSpotStore()!,
      app.getBagStore()!
    );
  }

  private constructor(
    private readonly campSpotStore: CampSpotStore,
    private readonly bagStore: BagStore
  ) {}

  public async getSpot(id: string): Promise<CampSpot | null> {
    return this.campSpotStore.getSpot(id);
  }

  // 박지 후기(CS-3): "{박지명} 백패킹" 네이버 블로그 상위 5건. 실패·키 미설정이면 null.
  public async getReviews(spotName: string): Promise<BlogReview[] | null> {
    return reviewSearchService.getBlogReviews(`${spotName} 백패킹`);
  }

  // 박지 후기 영상(CS-3): "{박지명} 백패킹" 유튜브 상위 4건. 실패·키 미설정이면 null.
  public async getVideos(spotName: string): Promise<VideoReview[] | null> {
    return reviewSearchService.getVideoReviews(`${spotName} 백패킹`);
  }

  // 후기 공유 캐시(DM-18) 조회 — 문서 없으면 null.
  public async getReviewCache(spotId: string): Promise<ReviewCache | null> {
    return this.campSpotStore.getReviewCache(spotId);
  }

  // 후기 공유 캐시(DM-18) 갱신.
  public async saveReviewCache(
    spotId: string,
    cache: ReviewCache
  ): Promise<void> {
    await this.campSpotStore.saveReviewCache(spotId, cache);
  }

  public async getBags(): Promise<BagItem[]> {
    return this.bagStore.getList();
  }

  // 배낭 여행지로 저장(CS-5). 날씨 스냅샷 갱신은 기존 BagWeather 흐름에 위임한다.
  public async setBagLocation(
    bagId: string,
    location: BagLocation
  ): Promise<void> {
    await this.bagStore.updateLocation(bagId, location);
  }
}

export default CampSiteDetailDispatcher;
