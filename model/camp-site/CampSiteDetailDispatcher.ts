import app from '../app/App';
import CampSpotStore from '../store/CampSpotStore';
import BagStore from '../store/BagStore';
import CampReviewStore from '../store/CampReviewStore';
import BagItem from '../bag/BagItem';
import reviewSearchService from '../review/ReviewSearchService';
import { CampSpot } from './CampSpotTypes';
import {
  BlogReview,
  ReviewCache,
  VideoReview,
} from '../review/ReviewTypes';
import { CampReview, CampReviewSummary } from '../camp-review/CampReviewTypes';
import { BagLocation } from '../weather/WeatherTypes';

// 박지 상세(CampSite CS-3/CS-5/CS-8)의 데이터 접근을 캡슐화한다.
class CampSiteDetailDispatcher {
  public static new() {
    return new CampSiteDetailDispatcher(
      app.getCampSpotStore()!,
      app.getBagStore()!,
      app.getCampReviewStore()!
    );
  }

  private constructor(
    private readonly campSpotStore: CampSpotStore,
    private readonly bagStore: BagStore,
    private readonly campReviewStore: CampReviewStore
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

  // 유저 후기 별점 요약(CS-8) 조회 — 문서 없으면 null.
  public async getReviewSummary(
    spotId: string
  ): Promise<CampReviewSummary | null> {
    return this.campReviewStore.getSummary(spotId);
  }

  // 유저 후기 목록(CS-8) 조회 — 최신 수정순.
  public async getUserReviews(spotId: string): Promise<CampReview[]> {
    return this.campReviewStore.getReviews(spotId);
  }

  // 내 후기 단건(CS-8) 조회 — 없으면 null.
  public async getMyReview(
    spotId: string,
    userId: string
  ): Promise<CampReview | null> {
    return this.campReviewStore.getMyReview(spotId, userId);
  }

  // 내 후기 삭제(CS-8) — 소유자만. 요약 집계는 스토어가 트랜잭션으로 반영한다.
  public async deleteReview(spotId: string, userId: string): Promise<void> {
    await this.campReviewStore.deleteReview(spotId, userId);
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
