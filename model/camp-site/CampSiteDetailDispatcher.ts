import app from '../app/App';
import CampSpotStore from '../store/CampSpotStore';
import BagStore from '../store/BagStore';
import CampReviewStore from '../store/CampReviewStore';
import BagItem from '../bag/BagItem';
import reviewSearchService from '../review/ReviewSearchService';
import { buildRequiredTokens } from '../review/ReviewRelevance';
import { CampSpot } from './CampSpotTypes';
import {
  BlogReview,
  ReviewCache,
  VideoReview,
} from '../review/ReviewTypes';
import { CampReview, CampReviewSummary } from '../camp-review/CampReviewTypes';
import { BagLocation } from '../bag-destination/BagLocation';
import { saveBagDestination } from '../bag-destination/BagDestinationSave';

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

  // 후기 검색어(CS-3): "{시·군·구} {박지명} 백패킹". 지역을 넣는 이유는 박지명이 유일하지 않기
  // 때문이다 — 큐레이션 276건에 `감악산` 3곳(경기 파주·강원 원주 등)이 있어 이름만 검색하면
  // 다른 지역 박지의 후기가 올라온다. city는 백필 이전 문서에 없을 수 있어(DM-17) 시·도(region)로,
  // 둘 다 없으면 박지명만으로 물러난다.
  private buildReviewQuery(spot: CampSpot): string {
    const area = (spot.city || spot.region || '').trim();

    const reviewType = '백패킹'; // l10n-ignore: 후기 검색 관련성 토큰

    return [area, spot.name, reviewType]
      .filter(part => Boolean(part))
      .join(' ');
  }

  // 박지 후기(CS-3): 네이버 블로그 후보 중 관련성 필터를 통과한 상위 5건. 실패·키 미설정이면 null.
  // 필수 토큰은 박지명만 유지한다 — 지역을 넣으면 제목에 지역만 있는 무관한 글
  // (`강원도 백패킹 명소`)이 통과한다.
  public async getReviews(spot: CampSpot): Promise<BlogReview[] | null> {
    return reviewSearchService.getBlogReviews({
      query: this.buildReviewQuery(spot),
      requiredTokens: buildRequiredTokens([spot.name]),
    });
  }

  // 박지 후기 영상(CS-3): 유튜브 후보 중 관련성 필터를 통과한 상위 4건. 실패·키 미설정이면 null.
  public async getVideos(spot: CampSpot): Promise<VideoReview[] | null> {
    return reviewSearchService.getVideoReviews({
      query: this.buildReviewQuery(spot),
      requiredTokens: buildRequiredTokens([spot.name]),
    });
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

  // 배낭 여행지로 저장(CS-5 → DST-6). 저장·날씨 조회 순서는 공용 경로가 정한다(그룹 일정 맞춤과 같은 경로).
  public async setBagDestination(
    bagId: string,
    location: BagLocation
  ): Promise<{ weatherFailed: boolean }> {
    return saveBagDestination(this.bagStore, bagId, location);
  }
}

export default CampSiteDetailDispatcher;
