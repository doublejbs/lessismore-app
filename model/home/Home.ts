import { makeAutoObservable, reaction } from 'mobx';
import { Platform } from 'react-native';
import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import OrderType from '@/model/order/OrderType';
import BagStore from '@/model/store/BagStore';
import GearStore from '@/model/store/GearStore';
import Firebase from '@/model/firebase/Firebase';
import app from '@/model/app/App';
import FeedContentStore from '@/model/store/FeedContentStore';
import { RecommendedSpot } from '@/model/feed/FeedContentTypes';
import CommunityStore from '@/model/store/CommunityStore';
import CommunityPost from '@/model/community/CommunityPost';
import { findLatestUnrecordedTrip } from '@/model/trip-record/TripRecordEligibility';

// 홈 `최근 여행 기록` 카드 수(HM-17).
const HOME_TRIP_RECORD_LIMIT = 5;

/**
 * 홈 화면(HM)의 도메인 모델.
 *
 * **새 컬렉션도 새 쿼리 형태도 만들지 않는다** — 배낭 목록과 창고 목록을 기존 스토어에서
 * 그대로 읽고, 어떤 배낭을 세울지·어떤 장비를 미리 보일지는 순수 함수(`HomeTripPlan`·
 * `HomeWarehousePreview`)가 클라이언트에서 계산한다. 홈에는 네트워크 왕복이 하나도
 * 추가되지 않는다.
 */
class Home {
  public static new() {
    return new Home(
      app.getBagStore()!,
      app.getGearStore()!,
      app.getFirebase(),
      app.getFeedContentStore()!,
      app.getCommunityStore()!,
    );
  }

  private bags: BagItem[] = [];
  private gears: Gear[] = [];
  private recommendedSpots: RecommendedSpot[] = [];
  private tripRecords: CommunityPost[] = [];
  // 기록이 없는 가장 최근 끝난 내 여행(HM-17 `내 여행 기록하기`). 없거나 확인 전·실패면 null.
  private unrecordedTrip: BagItem | null = null;
  // 첫 진입에는 스켈레톤이 보여야 하므로 true로 시작한다(HM-6).
  private loading = true;
  private readonly disposeLoginReaction: () => void;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly firebase: Firebase,
    private readonly feedContentStore: FeedContentStore,
    private readonly communityStore: CommunityStore
  ) {
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.load();
      }
    );

    makeAutoObservable(this);
  }

  /**
   * 배낭·장비를 함께 읽는다.
   *
   * **두 조회를 병렬로 낸다** — 순차로 하면 첫 진입 대기가 두 배가 되고, 둘 사이에
   * 의존이 없다. 한쪽이 실패해도 다른 쪽 카드는 그려야 하므로 개별로 감싼다.
   */
  public async load() {
    // 이미 내용이 있으면(재포커스) 스켈레톤으로 되돌리지 않는다 — 깜빡임 방지.
    if (
      this.firebase.isLoggedIn() &&
      this.bags.length === 0 &&
      this.gears.length === 0
    ) {
      this.setLoading(true);
    }

    if (this.firebase.isLoggedIn()) {
      const [bags, gears] = await Promise.all([
        this.loadBags(),
        this.loadGears(),
      ]);

      this.setBags(bags);
      this.setGears(gears);
    } else {
      this.setBags([]);
      this.setGears([]);
    }

    this.setLoading(false);

    // 추천은 기존 홈 콘텐츠의 렌더를 막지 않고 각 섹션별로 조용히 붙는다(HM-14).
    void this.loadRecommendations();
  }

  private async loadRecommendations() {
    const [spots, tripRecords, unrecordedTrip] = await Promise.all([
      this.loadRecommendedSpots(),
      this.loadTripRecords(),
      this.loadUnrecordedTrip(),
    ]);

    this.setRecommendedSpots(spots);
    this.setTripRecords(tripRecords);
    this.setUnrecordedTrip(unrecordedTrip);
  }

  // 최근 여행 기록(HM-17). 읽기 공개라 비로그인 홈에도 보인다. 실패는 조용히 숨긴다.
  private async loadTripRecords(): Promise<CommunityPost[]> {
    try {
      return await this.communityStore.getRecentTripRecords(HOME_TRIP_RECORD_LIMIT);
    } catch (error) {
      console.error('홈 여행 기록 조회 실패:', error); // l10n-ignore: 개발자 로그

      return [];
    }
  }

  // 웹은 기록 시트가 없어 진입점을 두지 않는다(CM-16 웹).
  private async loadUnrecordedTrip(): Promise<BagItem | null> {
    const userId = this.firebase.getUserId();

    if (Platform.OS === 'web' || !this.firebase.isLoggedIn() || !userId) {
      return null;
    }

    try {
      const recordedBagIds = await this.communityStore.getMyTripRecordBagIds(userId);

      return findLatestUnrecordedTrip(this.bags, recordedBagIds);
    } catch (error) {
      console.error('홈 내 여행 기록 확인 실패:', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }

  private async loadRecommendedSpots(): Promise<RecommendedSpot[]> {
    try {
      return await this.feedContentStore.getRecommendedSpots();
    } catch (error) {
      console.error('홈 추천 박지 조회 실패:', error); // l10n-ignore: 개발자 로그

      return [];
    }
  }

  private async loadBags(): Promise<BagItem[]> {
    try {
      return await this.bagStore.getList();
    } catch (e) {
      console.error('홈 배낭 조회 실패:', e); // l10n-ignore: 개발자 로그

      return [];
    }
  }

  private async loadGears(): Promise<Gear[]> {
    try {
      // 카테고리 필터는 홈에서 클라이언트로 거르므로 전체를 한 번만 읽는다.
      return await this.gearStore.getList(
        [GearFilter.All],
        OrderType.CreatedDesc
      );
    } catch (e) {
      console.error('홈 창고 조회 실패:', e); // l10n-ignore: 개발자 로그

      return [];
    }
  }

  public getBags() {
    return this.bags;
  }

  public getGears() {
    return this.gears;
  }

  public getRecommendedSpots() {
    return this.recommendedSpots;
  }

  public getTripRecords() {
    return this.tripRecords;
  }

  public getUnrecordedTrip() {
    return this.unrecordedTrip;
  }

  public isLoading() {
    return this.loading;
  }

  public isLoggedIn() {
    return this.firebase.isLoggedIn();
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  private setRecommendedSpots(value: RecommendedSpot[]) {
    this.recommendedSpots = value;
  }

  private setTripRecords(value: CommunityPost[]) {
    this.tripRecords = value;
  }

  private setUnrecordedTrip(value: BagItem | null) {
    this.unrecordedTrip = value;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  // 로그인 상태 reaction을 들고 있으므로 화면 언마운트 시 정리한다.
  public dispose() {
    this.disposeLoginReaction();
  }
}

export default Home;
