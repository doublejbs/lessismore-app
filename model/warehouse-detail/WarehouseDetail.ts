import { makeAutoObservable } from 'mobx';
import { Linking, Share } from 'react-native';
import { ImperativeRouter } from 'expo-router';
import WarehouseDispatcherType from '../warehouse/WarehouseDispatcherType';
import BagStore from '../store/BagStore';
import GearStore from '../store/GearStore';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';
import Gear from '../gear/Gear';
import BagItem from '../bag/BagItem';
import app from '../app/App';
import ReplyStore from '../store/ReplyStore';
import ReplyItem from '../reply/ReplyItem';
import dayjs from 'dayjs';
import Firebase from '../firebase/Firebase';
import LogInAlertManager from '../login/LogInAlertManager';
import SearchDispatcher from '../search/SearchDispatcher';
import Order from '../order/Order';
import Warehouse from '../warehouse/Warehouse';
import BagDetail from '../bag-detail/BagDetail';
import GearImageSelection from '../gear-image/GearImageSelection';
import GearImageType from '../gear/GearImageType';
import reviewSearchService from '../review/ReviewSearchService';
import {
  BlogReview,
  REVIEW_CACHE_TTL_MS,
  VideoReview,
} from '../review/ReviewTypes';
import { BagActivitySummary } from '../bag/BagActivitySummary';
import GearUsageStatus from './GearUsageStatus';

// 덜어내기 시그널(GD-12) 판정 대상 최근 기록 수.
const DECLUTTER_RECENT_TRIP_COUNT = 3;
// createDate 신뢰 하한(2010-01-01 UTC, ms) — 이보다 작으면 초 단위·쓰레기 값으로 보고 보유 일수를 숨긴다(GD-9).
const MIN_TRUSTED_CREATE_DATE_MS = 1262304000000;
const DAY_MS = 24 * 60 * 60 * 1000;

// GD-9 사용 지표 히어로 표시값.
export interface GearUsageStats {
  bagCount: number;
  usedCount: number;
  uselessCount: number;
  unrecordedCount: number;
}

// GD-10 여행 타임라인 1행 표시 데이터.
export interface GearTripRecord {
  bag: BagItem;
  status: GearUsageStatus;
}

// GD-11 활동 누적 합산값. 옵셔널 지표는 값이 있는 배낭이 하나도 없으면 null.
export interface GearActivityTotals {
  distanceM: number;
  durationSec: number;
  elevationGainM: number | null;
  activeEnergyKcal: number | null;
}

// GD-12 덜어내기 시그널. weightG가 null이면 무게 문구를 생략한다.
export interface GearDeclutterSignal {
  weightG: number | null;
}

class WarehouseDetail {
  public static new(
    router: ImperativeRouter,
    dispatcher: WarehouseDispatcherType
  ) {
    const searchDispatcher = SearchDispatcher.new();
    const warehouseOrder = Order.new(Warehouse.ORDER_KEY);
    const bagDetailOrder = Order.new(BagDetail.ORDER_KEY);

    return new WarehouseDetail(
      app.getBagStore()!,
      app.getGearStore()!,
      app.getReplyStore()!,
      router,
      dispatcher,
      app.getAlertManager()!,
      app.getToastManager()!,
      app.getFirebase()!,
      app.getLogInAlertManager()!,
      searchDispatcher,
      warehouseOrder,
      bagDetailOrder
    );
  }

  private gear: Gear | null = null;
  private bags: BagItem[] = [];
  private replies: ReplyItem[] = [];
  private initialized = false;
  private id: string = '';
  private showAddToBagModal = false;
  // GE-8: 배낭 장비 추가 검색에서 상세로 들어온 경우의 대상 배낭. 있으면 담기 버튼이 그 배낭에 바로 담는다.
  private bagContextId: string | null = null;
  private gearImageSelection: GearImageSelection | null = null;
  private coupangUrl: string | undefined = undefined;
  private reviews: BlogReview[] = [];
  private videos: VideoReview[] = [];
  private reviewRatingAvg: number = 0;
  private reviewRatingCount: number = 0;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly replyStore: ReplyStore,
    private readonly router: ImperativeRouter,
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly searchDispatcher: SearchDispatcher,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order
  ) {
    makeAutoObservable(this);
  }

  public async initialize(id: string) {
    try {
      this.setInitialized(false);
      this.setId(id);
      await this.getGearData();
      this.setInitialized(true);
    } catch (e) {
      window.alert(`잘못된 접근입니다. ${id} ${e}`);
    }
  }

  private async getGearData() {
    const gear = await this.gearStore.getGear(this.id);
    this.setGear(gear);

    if (gear) {
      void this.loadReviewContent(gear);
    }

    this.setBags(await this.bagStore.getBags(this.getGear()?.getBags() ?? []));
    await this.fetchReplies();
    await this.fetchReviewSummary();

    // 공유 이미지 기능 초기화 (isCustom === false인 경우만)
    if (gear && !gear.getIsCustom()) {
      this.gearImageSelection = GearImageSelection.new(
        this.id,
        gear.getIsCustom()
      );
      await this.gearImageSelection.loadImages();
      this.setCoupangUrl(await this.gearStore.getCoupangUrl(this.id));
    } else {
      this.gearImageSelection = null;
      this.setCoupangUrl(undefined);
    }
  }

  // 외부 후기(GD-6). Firestore 공유 캐시(DM-19)를 먼저 표시하고,
  // 7일이 지났거나 캐시가 없으면 외부 검색 API로 재조회해 최신화한다.
  // 재조회 실패 시 기존 캐시를 그대로 유지하고(가용성 우선), 캐시도 갱신하지 않는다.
  private async loadReviewContent(gear: Gear) {
    try {
      const gearId = gear.getId();
      const cached = await this.gearStore.getReviewCache(gearId).catch(e => {
        console.error('장비 후기 캐시 조회 실패:', e);

        return null;
      });

      if (cached) {
        this.setReviews(cached.reviews ?? []);
        this.setVideos(cached.videos ?? []);
      }

      const cachedAt = cached ? Date.parse(cached.updatedAt) : NaN;
      const isFresh =
        Number.isFinite(cachedAt) &&
        Date.now() - cachedAt < REVIEW_CACHE_TTL_MS;

      if (isFresh) {
        return;
      }

      // 검색어: "{제조사 표시명} {장비 표시명} 후기" — 제조사가 없으면 생략.
      const query =
        `${gear.getDisplayCompany() ?? ''} ${gear.getDisplayName()} 후기`.trim();
      const [reviews, videos] = await Promise.all([
        reviewSearchService.getBlogReviews(query),
        reviewSearchService.getVideoReviews(query),
      ]);

      // null = 해당 소스 조회 실패 → 캐시된 값(없으면 빈 배열)을 유지한다.
      this.setReviews(reviews ?? cached?.reviews ?? []);
      this.setVideos(videos ?? cached?.videos ?? []);

      // 두 소스 모두 성공했을 때만 저장 — 실패 결과로 공유 캐시를 오염시키지 않는다(DM-19).
      if (reviews !== null && videos !== null) {
        await this.gearStore
          .saveReviewCache(gearId, {
            reviews,
            videos,
            updatedAt: new Date().toISOString(),
          })
          .catch(e => {
            console.error('장비 후기 캐시 저장 실패:', e);
          });
      }
    } catch (e) {
      console.error('장비 후기 조회 실패:', e);
    }
  }

  private setReviews(value: BlogReview[]) {
    this.reviews = value;
  }

  public getExternalReviews() {
    return this.reviews;
  }

  private setVideos(value: VideoReview[]) {
    this.videos = value;
  }

  public getExternalVideos() {
    return this.videos;
  }

  // 외부 후기 항목 탭(GD-6): 외부 브라우저로 블로그 글을 연다. 실패는 조용히 무시.
  public async openExternalReview(review: BlogReview) {
    app.getAnalyticsManager()?.logClick('gear_review', { source: 'blog' });

    try {
      await Linking.openURL(review.link);
    } catch {
      // 외부 브라우저 열기 실패는 조용히 무시
    }
  }

  // 외부 후기 영상 탭(GD-6): 유튜브 영상을 연다. 실패는 조용히 무시.
  public async openExternalVideo(video: VideoReview) {
    app.getAnalyticsManager()?.logClick('gear_review', { source: 'youtube' });

    try {
      await Linking.openURL(`https://www.youtube.com/watch?v=${video.videoId}`);
    } catch {
      // 외부 앱/브라우저 열기 실패는 조용히 무시
    }
  }

  private setCoupangUrl(value: string | undefined) {
    this.coupangUrl = value;
  }

  public getCoupangUrl() {
    return this.coupangUrl;
  }

  public async openCoupangUrl() {
    const url = this.getCoupangUrl();

    if (!url) {
      return;
    }

    app.getAnalyticsManager()?.logClick('gear_purchase');

    try {
      await Linking.openURL(url);
    } catch {
      // 링크 열기 실패는 조용히 무시
    }
  }

  // 공유(GD-7): 장비 웹 랜딩 URL을 OS 공유 시트로 내보낸다(카탈로그 장비만).
  // 랜딩(useless.my/gear-share/{id})에서 앱으로 딥링크(lessismoreapp://gear-detail/{id})된다.
  public async share() {
    const gear = this.getGear();

    if (!gear || gear.getIsCustom()) {
      return;
    }

    app.getAnalyticsManager()?.logClick('gear_share');

    const url = `https://useless.my/gear-share/${encodeURIComponent(gear.getId())}`;

    try {
      // URL만 공유 — 텍스트를 붙이면 '복사' 시 링크로 동작하지 않는다(CS-7과 동일).
      await Share.share({ message: url });
    } catch {
      // 공유 시트 취소·실패는 조용히 무시
    }
  }

  public edit() {
    if (this.getGear()) {
      this.router.push(`/gear-edit/${this.getGear()?.getId()}`);
    }
  }

  public async delete(gear: Gear) {
    this.alertManager.show({
      message: `${gear.getName()}을 삭제하시겠습니까?`,
      confirmText: '삭제하기',
      onConfirm: async () => {
        await this.deleteGear(gear);
      },
    });
  }

  private async deleteGear(gear: Gear) {
    await this.dispatcher.remove(gear);
    this.toastManager.show({ message: '삭제 되었습니다.' });
    this.close();
  }

  private setGear(gear: Gear | null) {
    this.gear = gear;
  }

  public getGear() {
    return this.gear;
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  // GD-9: 담김/사용/안 씀/미기록 지표. 미기록은 음수 방지(max 0) — 3-상태 원칙상 '안 씀'에 합산하지 않는다.
  // 기준은 gear.bags 배열이 아니라 **실제 로드된 배낭 목록** — 삭제 잔여 id가 남아 있어도
  // 타임라인 행 수·"함께한 여행 N회" 헤더와 수치가 항상 일치한다.
  public getUsageStats(): GearUsageStats {
    const gear = this.getGear();

    if (!gear) {
      return { bagCount: 0, usedCount: 0, uselessCount: 0, unrecordedCount: 0 };
    }

    const loadedBags = this.bags;
    const bagCount = loadedBags.length;
    const usedCount = loadedBags.filter(bag =>
      gear.hasUsed(bag.getID())
    ).length;
    const uselessCount = loadedBags.filter(bag =>
      gear.hasUseless(bag.getID())
    ).length;

    return {
      bagCount,
      usedCount,
      uselessCount,
      unrecordedCount: Math.max(0, bagCount - usedCount - uselessCount),
    };
  }

  // GD-9: 보유 D일째(등록일 포함해 1일째부터). createDate가 누락·미래·비정상 값이면 null(미표시).
  public getOwnedDays(): number | null {
    const createDate = this.getGear()?.getCreateDate();
    const now = Date.now();

    if (
      typeof createDate !== 'number' ||
      !Number.isFinite(createDate) ||
      createDate < MIN_TRUSTED_CREATE_DATE_MS ||
      createDate > now
    ) {
      return null;
    }

    return Math.floor((now - createDate) / DAY_MS) + 1;
  }

  // GD-10: 여행 타임라인 — startDate 내림차순, 날짜 없는 배낭은 뒤로, 동순위는 editDate 내림차순.
  public getTripRecords(): GearTripRecord[] {
    const gear = this.getGear();

    if (!gear) {
      return [];
    }

    const sorted = [...this.bags].sort((a, b) => {
      const aStart = a.getStartDateValue();
      const bStart = b.getStartDateValue();

      if (aStart !== null && bStart !== null && aStart !== bStart) {
        return bStart - aStart;
      }

      if (aStart === null && bStart !== null) {
        return 1;
      }

      if (aStart !== null && bStart === null) {
        return -1;
      }

      return b.getEditDateValue() - a.getEditDateValue();
    });

    return sorted.map(bag => {
      const bagId = bag.getID();
      const status = gear.hasUsed(bagId)
        ? GearUsageStatus.Used
        : gear.hasUseless(bagId)
          ? GearUsageStatus.Useless
          : GearUsageStatus.Unrecorded;

      return {
        bag,
        status,
      };
    });
  }

  // GD-11: 사용한 여행의 운동 기록 합산. 대상이 하나도 없으면 null(섹션 미렌더).
  public getActivityTotals(): GearActivityTotals | null {
    const gear = this.getGear();

    if (!gear) {
      return null;
    }

    const activities = this.bags
      .filter(bag => gear.hasUsed(bag.getID()))
      .map(bag => bag.getActivity())
      .filter((activity): activity is BagActivitySummary => activity !== null);

    if (activities.length === 0) {
      return null;
    }

    const sumOptional = (values: (number | undefined)[]): number | null => {
      const present = values.filter((value): value is number => value != null);

      if (present.length === 0) {
        return null;
      }

      return present.reduce((acc, value) => acc + value, 0);
    };

    return {
      // 타입상 필수 필드지만 Firestore 실데이터 결손(NaN 노출)을 방어한다.
      distanceM: activities.reduce(
        (acc, activity) => acc + (activity.distance ?? 0),
        0
      ),
      durationSec: activities.reduce(
        (acc, activity) => acc + (activity.duration ?? 0),
        0
      ),
      elevationGainM: sumOptional(
        activities.map(activity => activity.elevationGain)
      ),
      activeEnergyKcal: sumOptional(
        activities.map(activity => activity.activeEnergy)
      ),
    };
  }

  // GD-12: 기록된 여행 3회 이상 + 기록 기준 최근 3회 모두 '안 씀'이면 덜어내기 시그널.
  // 최근 판정은 startDate 내림차순, 날짜 없으면 editDate로 대체한다.
  public getDeclutterSignal(): GearDeclutterSignal | null {
    const gear = this.getGear();

    if (!gear) {
      return null;
    }

    const recorded = this.bags.filter(
      bag => gear.hasUsed(bag.getID()) || gear.hasUseless(bag.getID())
    );

    if (recorded.length < DECLUTTER_RECENT_TRIP_COUNT) {
      return null;
    }

    const recentBags = [...recorded]
      .sort((a, b) => {
        const aKey = a.getStartDateValue() ?? a.getEditDateValue();
        const bKey = b.getStartDateValue() ?? b.getEditDateValue();

        return bKey - aKey;
      })
      .slice(0, DECLUTTER_RECENT_TRIP_COUNT);
    const isAllUseless = recentBags.every(bag => gear.hasUseless(bag.getID()));

    if (!isAllUseless) {
      return null;
    }

    const weight = Number(gear.getWeight());

    return {
      weightG: Number.isFinite(weight) && weight > 0 ? weight : null,
    };
  }

  private setInitialized(initialized: boolean) {
    this.initialized = initialized;
  }

  public isInitialized() {
    return this.initialized;
  }

  public close() {
    // 공유 딥링크로 상세가 첫 화면으로 열리면 돌아갈 화면이 없어 back()이 실패한다
    // ('GO_BACK not handled'). 이 경우 창고(홈) 탭으로 보낸다.
    if (this.router.canGoBack()) {
      this.router.back();
    } else {
      this.router.replace('/');
    }
  }

  private setId(id: string) {
    this.id = id;
  }

  public goToBag(bag: BagItem) {
    this.router.push(`/bag/${bag.getID()}`);
  }

  public async fetchReplies() {
    try {
      const data = await this.replyStore.getLatestComment(this.id);

      if (data) {
        this.setReplies([
          ReplyItem.new(data.id, data.content, dayjs(data.createdAt)),
        ]);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // 리뷰 별점 요약(RP-6): 평균 별점·별점 리뷰 수를 로드한다.
  // 실패 시 조용히 삼키고 0을 유지한다(가용성 우선).
  private async fetchReviewSummary() {
    try {
      const summary = await this.replyStore.getGearCommentSummary(this.id);

      if (summary) {
        this.setReviewRatingSummary(summary.ratingAvg, summary.ratingCount);
      } else {
        this.setReviewRatingSummary(0, 0);
      }
    } catch (error) {
      console.error(error);
    }
  }

  private setReviewRatingSummary(avg: number, count: number) {
    this.reviewRatingAvg = avg;
    this.reviewRatingCount = count;
  }

  public getReviewRatingAvg() {
    return this.reviewRatingAvg;
  }

  public getReviewRatingCount() {
    return this.reviewRatingCount;
  }

  private setReplies(value: ReplyItem[]) {
    this.replies = value;
  }

  public getReplies() {
    return this.replies;
  }

  public hasReplies() {
    return this.replies.length > 0;
  }

  public replyCount() {
    return this.replies.length;
  }

  public getId() {
    return this.id;
  }

  public goToReply() {
    if (this.firebase.isLoggedIn()) {
      this.router.push(`/reply/${this.getId()}`);
    } else {
      this.logInAlertManager.show();
    }
  }

  public async addToWarehouse(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    await this.searchDispatcher.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();
    this.toastManager.show({ message: '장비가 추가되었습니다.' });
    this.setShowAddToBagModal(true);

    await this.initialize(this.getId());

    return true;
  }

  // GE-8: 배낭 장비 추가 컨텍스트. 창고에 없으면 등록 후 그 배낭에 바로 담고, 담으면 검색으로 돌아간다.
  public setBagContext(bagId: string) {
    this.bagContextId = bagId;
  }

  public isBagContext() {
    return this.bagContextId !== null;
  }

  public isInBagContextBag() {
    return (
      this.bagContextId !== null &&
      (this.getGear()?.getBags().includes(this.bagContextId) ?? false)
    );
  }

  public async addToBag(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    const bagId = this.bagContextId;

    if (bagId === null) {
      return this.addToWarehouse(gear);
    }

    // 창고에 없으면 먼저 등록한다(이미 보유면 재등록하지 않아 gear-rank 중복 집계를 피한다).
    if (!gear.isAdded()) {
      await this.searchDispatcher.register([gear]);
      await this.warehouseOrder.saveLastOrderOption();
      await this.bagDetailOrder.saveLastOrderOption();
    }

    if (gear.getBags().includes(bagId)) {
      this.toastManager.show({ message: '이미 이 배낭에 담겨 있어요.' });
      this.router.back();

      return true;
    }

    await this.bagStore.addGear(bagId, gear);
    this.toastManager.show({ message: '배낭에 담았어요.' });
    this.router.back();

    return true;
  }

  private setShowAddToBagModal(value: boolean) {
    this.showAddToBagModal = value;
  }

  public shouldShowAddToBagModal() {
    return this.showAddToBagModal;
  }

  public async closeAddToBagModal() {
    this.setShowAddToBagModal(false);
    await this.initialize(this.getId());
  }

  public getGearImageSelection() {
    return this.gearImageSelection;
  }

  public async selectSharedImage(image: GearImageType): Promise<void> {
    if (!this.gear) return;

    // 사용자의 장비 imageUrl을 선택한 이미지로 업데이트
    const updatedGear = new Gear(
      this.gear.getId(),
      this.gear.getName(),
      this.gear.getCompany(),
      this.gear.getWeight(),
      image.url,
      this.gear.isAdded(),
      this.gear.getIsCustom(),
      this.gear.getCategory(),
      this.gear.getUseless(),
      this.gear.getUsed(),
      this.gear.getBags(),
      this.gear.getCreateDate(),
      this.gear.getColor(),
      this.gear.getCompanyKorean(),
      this.gear.getNameKorean(),
      // 기존 gear에서 재구성 — specs/size 등 신규 필드를 보존한다.
      this.gear.getExtra()
    );

    await this.gearStore.update(updatedGear);
    this.setGear(updatedGear);
    this.gearImageSelection?.hideModal();
    this.toastManager.show({ message: '이미지가 변경되었습니다.' });
  }
}

export default WarehouseDetail;
