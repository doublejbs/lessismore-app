import { makeAutoObservable } from 'mobx';
import { Alert, Linking, Share } from 'react-native';
import { ImperativeRouter } from 'expo-router';
import app from '../app/App';
import AlertManager from '../alert/AlertManager';
import Firebase from '../firebase/Firebase';
import ToastManager from '../toast/ToastManager';
import LogInAlertManager from '../login/LogInAlertManager';
import AnalyticsManager from '../analytics/AnalyticsManager';
import BagItem from '../bag/BagItem';
import CampSiteDetailDispatcher from './CampSiteDetailDispatcher';
import CampFavoriteStore from '../store/CampFavoriteStore';
import { CampSpot } from './CampSpotTypes';
import {
  BlogReview,
  getUsableReviewCache,
  REVIEW_CACHE_TTL_MS,
  REVIEW_QUERY_VERSION,
  VideoReview,
} from '../review/ReviewTypes';
import { CampReview, CampReviewSummary } from '../camp-review/CampReviewTypes';
import { setCampReviewWrite } from '../camp-review/CampReviewWriteHandoff';
import { setPendingBagLocation } from '../bag/PendingBagLocationHandoff';
import { getCampShareUrl } from '@/constants/WebLinks';

// 박지 상세 도메인 모델 (CampSite CS-3/CS-4/CS-5).
// 3단 래퍼(라우트 → Wrapper → View) 중 상태·비즈니스 로직을 담당한다.
class CampSiteDetail {
  public static new(router: ImperativeRouter, dispatcher: CampSiteDetailDispatcher) {
    return new CampSiteDetail(
      router,
      dispatcher,
      app.getAlertManager()!,
      app.getFirebase(),
      app.getToastManager()!,
      app.getLogInAlertManager()!,
      app.getAnalyticsManager(),
      app.getCampFavoriteStore()!
    );
  }

  private spot: CampSpot | null = null;
  private initialized = false;
  private reviews: BlogReview[] = [];
  private videos: VideoReview[] = [];
  private bags: BagItem[] = [];
  private showBagSheet = false;
  private reviewSummary: CampReviewSummary | null = null;
  private userReviews: CampReview[] = [];
  private myReview: CampReview | null = null;

  private constructor(
    private readonly router: ImperativeRouter,
    private readonly dispatcher: CampSiteDetailDispatcher,
    private readonly alertManager: AlertManager,
    private readonly firebase: Firebase,
    private readonly toastManager: ToastManager,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly analyticsManager: AnalyticsManager | null,
    private readonly favoriteStore: CampFavoriteStore
  ) {
    makeAutoObservable(this);
  }

  public async initialize(id: string) {
    this.setInitialized(false);

    try {
      const spot = await this.dispatcher.getSpot(id);

      if (!spot) {
        throw new Error(`camp-spot not found: ${id}`);
      }

      this.setSpot(spot);
      this.analyticsManager?.logClick('camp_site');
      this.setInitialized(true);

      void this.loadReviewContent(spot);
      void this.loadUserReviews(spot.id);
    } catch (e) {
      console.error('박지 상세 로드 실패:', e);
      Alert.alert('알림', '박지 정보를 불러오지 못했어요.', [
        { text: '확인', onPress: () => this.close() },
      ]);
    }
  }

  private setSpot(value: CampSpot | null) {
    this.spot = value;
  }

  public getSpot() {
    return this.spot;
  }

  // 박지 후기·영상(CS-3). Firestore 공유 캐시(DM-18)를 먼저 표시하고,
  // 7일이 지났거나 캐시가 없거나 queryVersion이 현재보다 낮으면 외부 검색 API로 재조회해 최신화한다.
  // 재조회 실패 시 기존 캐시를 그대로 유지하고(가용성 우선), 캐시도 갱신하지 않는다.
  private async loadReviewContent(spot: CampSpot) {
    try {
      const cached = await this.dispatcher.getReviewCache(spot.id).catch(e => {
        console.error('박지 후기 캐시 조회 실패:', e);

        return null;
      });

      // 옛 규칙으로 담긴 캐시는 이미 부적합으로 판정된 결과라 표시하지 않고 재조회한다(DM-18).
      const usableCache = getUsableReviewCache(cached);

      if (usableCache) {
        this.setReviews(usableCache.reviews ?? []);
        this.setVideos(usableCache.videos ?? []);
      }

      const cachedAt = usableCache ? Date.parse(usableCache.updatedAt) : NaN;
      const isFresh =
        Number.isFinite(cachedAt) &&
        Date.now() - cachedAt < REVIEW_CACHE_TTL_MS;

      if (isFresh) {
        return;
      }

      const [reviews, videos] = await Promise.all([
        // 검색어에 지역을 붙이려면 박지명만으로는 부족해 박지 전체를 넘긴다(CS-3).
        this.dispatcher.getReviews(spot),
        this.dispatcher.getVideos(spot),
      ]);

      // null = 해당 소스 조회 실패 → 같은 규칙으로 담긴 캐시가 있으면 그 값을 유지한다.
      this.setReviews(reviews ?? usableCache?.reviews ?? []);
      this.setVideos(videos ?? usableCache?.videos ?? []);

      // 두 소스 모두 성공했을 때만 저장 — 실패 결과로 공유 캐시를 오염시키지 않는다(DM-18).
      if (reviews !== null && videos !== null) {
        await this.dispatcher
          .saveReviewCache(spot.id, {
            reviews,
            videos,
            updatedAt: new Date().toISOString(),
            queryVersion: REVIEW_QUERY_VERSION,
          })
          .catch(e => {
            console.error('박지 후기 캐시 저장 실패:', e);
          });
      }
    } catch (e) {
      console.error('박지 후기 조회 실패:', e);
    }
  }

  private setReviews(value: BlogReview[]) {
    this.reviews = value;
  }

  public getReviews() {
    return this.reviews;
  }

  private setVideos(value: VideoReview[]) {
    this.videos = value;
  }

  public getVideos() {
    return this.videos;
  }

  // 유저 후기(CS-8): 별점 요약·후기 목록을 병렬 조회하고, 로그인 상태면 내 후기도 함께 조회한다.
  // 실패는 삼키고 빈 상태를 유지한다(가용성 우선).
  private async loadUserReviews(spotId: string) {
    try {
      const isLoggedIn = this.firebase.isLoggedIn();

      const [summary, reviews, myReview] = await Promise.all([
        this.dispatcher.getReviewSummary(spotId),
        this.dispatcher.getUserReviews(spotId),
        isLoggedIn
          ? this.dispatcher.getMyReview(spotId, this.firebase.getUserId())
          : Promise.resolve(null),
      ]);

      this.setReviewSummary(summary);
      this.setUserReviews(reviews);
      this.setMyReview(myReview);
    } catch (e) {
      console.error('박지 유저 후기 조회 실패:', e);
    }
  }

  private setReviewSummary(value: CampReviewSummary | null) {
    this.reviewSummary = value;
  }

  public getReviewSummary() {
    return this.reviewSummary;
  }

  private setUserReviews(value: CampReview[]) {
    this.userReviews = value;
  }

  public getUserReviews() {
    return this.userReviews;
  }

  private setMyReview(value: CampReview | null) {
    this.myReview = value;
  }

  public getMyReview() {
    return this.myReview;
  }

  // 후기 쓰기/수정 진입(CS-8): 비로그인은 안내. 로그인이면 작성 formSheet로 핸드오프를 넘긴다.
  public openWriteReview() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    this.analyticsManager?.logClick('camp_site_review_write');

    setCampReviewWrite({
      spotId: spot.id,
      spotName: spot.name,
      existing: this.myReview,
      onComplete: () => {
        void this.loadUserReviews(spot.id);
      },
    });
    this.router.push('/camp-review-write');
  }

  // 내 후기 삭제(CS-8): 실제 삭제만 담당. 확인 다이얼로그는 뷰에서 처리한다.
  public async deleteMyReview() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    if (!this.firebase.isLoggedIn()) {
      return;
    }

    await this.dispatcher.deleteReview(spot.id, this.firebase.getUserId());
    await this.loadUserReviews(spot.id);
  }

  // 후기에 첨부된 배낭 탭(CS-8): 공유 배낭 화면으로 이동한다.
  public openReviewBag(bagId: string) {
    this.analyticsManager?.logClick('camp_site_review_bag');
    this.router.push(`/shared-bag/${bagId}`);
  }

  // 뷰에서 소유자·로그인 분기용.
  public isLoggedIn() {
    return this.firebase.isLoggedIn();
  }

  public getMyUserId() {
    return this.firebase.getUserId();
  }

  // 후기 항목 탭(CS-3): 외부 브라우저로 블로그 글을 연다. 실패는 조용히 무시.
  public async openReview(review: BlogReview) {
    this.analyticsManager?.logClick('camp_site_review', { source: 'blog' });

    try {
      await Linking.openURL(review.link);
    } catch {
      // 외부 브라우저 열기 실패는 조용히 무시
    }
  }

  // 후기 영상 카드 탭(CS-3): 유튜브 영상을 연다(유튜브 앱/브라우저). 실패는 조용히 무시.
  public async openVideo(video: VideoReview) {
    this.analyticsManager?.logClick('camp_site_review', { source: 'youtube' });

    try {
      await Linking.openURL(`https://www.youtube.com/watch?v=${video.videoId}`);
    } catch {
      // 외부 앱/브라우저 열기 실패는 조용히 무시
    }
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  // 시트(닫기 X)·페이지(뒤로가기·로드 실패 Alert의 '확인') 모두 이 경로로 화면을 닫는다.
  public close() {
    // 앱이 꺼진 상태에서 공유 딥링크로 상세가 첫 화면으로 열리면 돌아갈 화면이 없어
    // router.back()이 'GO_BACK not handled'로 실패한다 — 이 경우 지도 탭으로 보낸다.
    if (this.router.canGoBack()) {
      this.router.back();
    } else {
      this.router.replace('/map');
    }
  }

  // 즐겨찾기 여부(CS-9). 뷰는 observer라 ObservableSet 변경 시 자동 반영된다.
  public isFavorite(): boolean {
    const spot = this.spot;

    if (!spot) {
      return false;
    }

    return this.favoriteStore.isFavorite(spot.id);
  }

  // 즐겨찾기 토글(CS-9): 비로그인은 안내 후 중단. 낙관적 갱신 — 실패 시 스토어가
  // 롤백하고 여기서 토스트로 안내한다.
  public async toggleFavorite() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();

      return;
    }

    const willFavorite = !this.favoriteStore.isFavorite(spot.id);

    if (willFavorite) {
      this.analyticsManager?.logClick('camp_site_favorite');
    }

    try {
      await this.favoriteStore.toggle({ id: spot.id, name: spot.name });
    } catch (e) {
      console.error('박지 즐겨찾기 토글 실패:', e);
      this.toastManager.show({ message: '잠시 후 다시 시도해주세요' });
    }
  }

  // 공유(CS-7): 박지 웹 랜딩 URL을 OS 공유 시트로 내보낸다.
  // 랜딩(WEB_BASE_URL/camp-share/{id})에서 앱으로 딥링크(lessismoreapp://camp-site/{id})된다.
  public async share() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    this.analyticsManager?.logClick('camp_site_share');

    // 문서 id에 콜론(예: curated:seokseongsan)이 들어가 있다. 메신저의 URL 자동 링크화가
    // 콜론에서 끊겨 링크가 깨지므로 퍼센트 인코딩(%3A)한다 — 웹 랜딩(React Router)이 복원한다.
    const url = getCampShareUrl(spot.id);

    try {
      // URL만 공유한다 — 이름 등 텍스트를 붙이면 '복사' 시 URL이 아닌 문자열이 복사돼
      // 사파리에 붙여넣어도 링크로 동작하지 않는다.
      await Share.share({ message: url });
    } catch {
      // 공유 시트 취소·실패는 조용히 무시
    }
  }

  // 네이버 지도에서 열기(CS-3): 좌표·박지명으로 네이버 지도 앱을 연다.
  // 앱 미설치·실패 시 네이버 지도 웹 검색으로 폴백한다.
  public async openNaverMap() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    this.analyticsManager?.logClick('camp_site_directions');

    const { latitude, longitude } = spot.location;
    const appUrl = `nmap://place?lat=${latitude}&lng=${longitude}&name=${encodeURIComponent(spot.name)}&appname=com.doublejbs.useless`;
    const webUrl = `https://map.naver.com/p/search/${encodeURIComponent(spot.name)}`;

    try {
      await Linking.openURL(appUrl);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch {
        // 웹 폴백까지 실패하면 조용히 무시
      }
    }
  }

  // 배낭 여행지로 설정 버튼(CS-5). 비로그인은 안내, 배낭 0개여도 시트를 열어
  // '새 배낭 만들기'로 생성할 수 있게 한다.
  public async openBagSheet() {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    const bags = await this.dispatcher.getBags();

    this.setBags(bags);
    this.setShowBagSheet(true);
  }

  // 배낭 선택 시트의 '새 배낭 만들기'(CS-5): 박지 좌표를 핸드오프로 넘기고
  // 배낭 생성 formSheet로 이동한다. 생성 완료 후 새 배낭에 여행지가 저장된다.
  public createBagForSpot() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    setPendingBagLocation({
      name: spot.name,
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
      campSpotId: spot.id,
    });
    this.closeBagSheet();
    this.router.push('/bag-new');
  }

  public closeBagSheet() {
    this.setShowBagSheet(false);
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public getBags() {
    return this.bags;
  }

  private setShowBagSheet(value: boolean) {
    this.showBagSheet = value;
  }

  public shouldShowBagSheet() {
    return this.showBagSheet;
  }

  // 선택한 배낭의 여행지에 이 박지를 저장한다(CS-5 → DST-5).
  // 이미 다른 여행지가 있으면 덮어쓰기 전에 확인받고, 같은 박지면 확인 없이 완료 처리한다.
  public async selectBag(bag: BagItem) {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    const existingLocation = bag.getLocation();

    // 같은 박지는 확인 없이 다시 저장해 박지의 최신 이름·좌표 스냅샷까지 반영한다(DST-7).
    if (existingLocation?.campSpotId === spot.id) {
      await this.saveBagDestination(bag, spot);

      return;
    }

    if (existingLocation) {
      this.alertManager.show({
        message: `${existingLocation.name}에서 ${spot.name}(으)로 변경할까요?`,
        confirmText: '변경',
        onConfirm: async () => {
          await this.saveBagDestination(bag, spot);
        },
      });

      return;
    }

    await this.saveBagDestination(bag, spot);
  }

  private async saveBagDestination(bag: BagItem, spot: CampSpot) {
    try {
      const { weatherFailed } = await this.dispatcher.setBagDestination(
        bag.getID(),
        {
          name: spot.name,
          latitude: spot.location.latitude,
          longitude: spot.location.longitude,
          campSpotId: spot.id,
        }
      );

      this.completeBagSelection(bag, weatherFailed);
    } catch (e) {
      console.error('배낭 여행지 저장 실패:', e);
      Alert.alert('오류', '여행지를 저장하지 못했어요. 다시 시도해주세요.');
    }
  }

  // 설정한 배낭으로 바로 이동할 수 있게 토스트에 액션을 넣는다(CS-5).
  // Android는 네이티브 토스트라 버튼 미지원 — 메시지만 표시된다.
  private completeBagSelection(bag: BagItem, weatherFailed: boolean) {
    this.toastManager.show({
      message: weatherFailed
        ? '여행지는 설정했지만 날씨를 불러오지 못했어요.'
        : '여행지로 설정했어요.',
      buttonText: weatherFailed ? '다시 시도' : '이동',
      onButtonPress: () => {
        this.router.push(
          weatherFailed ? `/bag/${bag.getID()}/weather` : `/bag/${bag.getID()}`
        );
      },
    });
    this.closeBagSheet();
  }
}

export default CampSiteDetail;
