import { makeAutoObservable } from 'mobx';
import { Alert, Linking, Platform } from 'react-native';
import { Router } from 'expo-router';
import app from '../app/App';
import Firebase from '../firebase/Firebase';
import ToastManager from '../toast/ToastManager';
import LogInAlertManager from '../login/LogInAlertManager';
import AnalyticsManager from '../analytics/AnalyticsManager';
import BagItem from '../bag/BagItem';
import CampSiteDetailDispatcher from './CampSiteDetailDispatcher';
import { CampSpot } from './CampSpotTypes';
import { CampSiteReview, CampSiteVideo } from './CampSiteReviewTypes';

// 박지 상세 도메인 모델 (CampSite CS-3/CS-4/CS-5).
// 3단 래퍼(라우트 → Wrapper → View) 중 상태·비즈니스 로직을 담당한다.
class CampSiteDetail {
  public static new(router: Router, dispatcher: CampSiteDetailDispatcher) {
    return new CampSiteDetail(
      router,
      dispatcher,
      app.getFirebase(),
      app.getToastManager()!,
      app.getLogInAlertManager()!,
      app.getAnalyticsManager()
    );
  }

  private spot: CampSpot | null = null;
  private initialized = false;
  private reviews: CampSiteReview[] = [];
  private videos: CampSiteVideo[] = [];
  private bags: BagItem[] = [];
  private showBagSheet = false;

  private constructor(
    private readonly router: Router,
    private readonly dispatcher: CampSiteDetailDispatcher,
    private readonly firebase: Firebase,
    private readonly toastManager: ToastManager,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly analyticsManager: AnalyticsManager | null
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

      void this.loadReviews(spot);
      void this.loadVideos(spot);
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

  // 박지 후기(CS-3). 키 미설정·실패·0건이면 빈 배열을 유지한다(리스트만 생략, 조용히).
  private async loadReviews(spot: CampSpot) {
    try {
      const reviews = await this.dispatcher.getReviews(spot.name);

      this.setReviews(reviews);
    } catch (e) {
      console.error('박지 후기 조회 실패:', e);
      this.setReviews([]);
    }
  }

  private setReviews(value: CampSiteReview[]) {
    this.reviews = value;
  }

  public getReviews() {
    return this.reviews;
  }

  // 박지 후기 영상(CS-3). 키 미설정·실패·0건이면 빈 배열을 유지한다(리스트만 생략, 조용히).
  private async loadVideos(spot: CampSpot) {
    try {
      const videos = await this.dispatcher.getVideos(spot.name);

      this.setVideos(videos);
    } catch (e) {
      console.error('박지 후기 영상 조회 실패:', e);
      this.setVideos([]);
    }
  }

  private setVideos(value: CampSiteVideo[]) {
    this.videos = value;
  }

  public getVideos() {
    return this.videos;
  }

  // 후기 항목 탭(CS-3): 외부 브라우저로 블로그 글을 연다. 실패는 조용히 무시.
  public async openReview(review: CampSiteReview) {
    this.analyticsManager?.logClick('camp_site_review', { source: 'blog' });

    try {
      await Linking.openURL(review.link);
    } catch {
      // 외부 브라우저 열기 실패는 조용히 무시
    }
  }

  // 후기 영상 카드 탭(CS-3): 유튜브 영상을 연다(유튜브 앱/브라우저). 실패는 조용히 무시.
  public async openVideo(video: CampSiteVideo) {
    this.analyticsManager?.logClick('camp_site_review', { source: 'youtube' });

    try {
      await Linking.openURL(`https://www.youtube.com/watch?v=${video.videoId}`);
    } catch {
      // 외부 앱/브라우저 열기 실패는 조용히 무시
    }
  }

  // 주간 날씨 버튼 탭(CS-3): 박지 전용 주간 날씨 페이지로 이동한다.
  public openWeather() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    this.router.push(`/camp-site-weather/${spot.id}`);
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public close() {
    this.router.back();
  }

  // 길찾기(CS-3): 외부 지도앱을 좌표로 연다. 실패는 조용히 무시.
  public async openDirections() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    this.analyticsManager?.logClick('camp_site_directions');

    const { latitude, longitude } = spot.location;
    const url =
      Platform.OS === 'ios'
        ? `maps://?ll=${latitude},${longitude}&q=${encodeURIComponent(spot.name)}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${spot.name})`;

    try {
      await Linking.openURL(url);
    } catch {
      // 외부 지도앱 열기 실패는 조용히 무시
    }
  }

  // 배낭 여행지로 설정 버튼(CS-5). 비로그인·배낭 0개는 눌렀을 때 안내한다.
  public async openBagSheet() {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    const bags = await this.dispatcher.getBags();

    if (bags.length === 0) {
      this.toastManager.show({ message: '설정할 배낭이 없어요.' });
      return;
    }

    this.setBags(bags);
    this.setShowBagSheet(true);
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

  // 선택한 배낭의 location 에 박지 좌표를 저장한다(CS-5).
  public async selectBag(bag: BagItem) {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    await this.dispatcher.setBagLocation(bag.getID(), {
      name: spot.name,
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
    });

    this.toastManager.show({ message: '여행지로 설정했어요.' });
    this.closeBagSheet();
  }
}

export default CampSiteDetail;
