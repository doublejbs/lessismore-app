import { makeAutoObservable } from 'mobx';
import { Alert, Linking, Share } from 'react-native';
import { Router } from 'expo-router';
import app from '../app/App';
import Firebase from '../firebase/Firebase';
import ToastManager from '../toast/ToastManager';
import LogInAlertManager from '../login/LogInAlertManager';
import AnalyticsManager from '../analytics/AnalyticsManager';
import BagItem from '../bag/BagItem';
import CampSiteDetailDispatcher from './CampSiteDetailDispatcher';
import { CampSpot } from './CampSpotTypes';
import { BlogReview, REVIEW_CACHE_TTL_MS, VideoReview } from '../review/ReviewTypes';
import { setPendingBagLocation } from '../bag/PendingBagLocationHandoff';

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
  private reviews: BlogReview[] = [];
  private videos: VideoReview[] = [];
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

      void this.loadReviewContent(spot);
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
  // 7일이 지났거나 캐시가 없으면 외부 검색 API로 재조회해 최신화한다.
  // 재조회 실패 시 기존 캐시를 그대로 유지하고(가용성 우선), 캐시도 갱신하지 않는다.
  private async loadReviewContent(spot: CampSpot) {
    try {
      const cached = await this.dispatcher.getReviewCache(spot.id).catch(e => {
        console.error('박지 후기 캐시 조회 실패:', e);

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

      const [reviews, videos] = await Promise.all([
        this.dispatcher.getReviews(spot.name),
        this.dispatcher.getVideos(spot.name),
      ]);

      // null = 해당 소스 조회 실패 → 캐시된 값(없으면 빈 배열)을 유지한다.
      this.setReviews(reviews ?? cached?.reviews ?? []);
      this.setVideos(videos ?? cached?.videos ?? []);

      // 두 소스 모두 성공했을 때만 저장 — 실패 결과로 공유 캐시를 오염시키지 않는다(DM-18).
      if (reviews !== null && videos !== null) {
        await this.dispatcher
          .saveReviewCache(spot.id, {
            reviews,
            videos,
            updatedAt: new Date().toISOString(),
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
    // 앱이 꺼진 상태에서 공유 딥링크로 상세가 첫 화면으로 열리면 돌아갈 화면이 없어
    // router.back()이 'GO_BACK not handled'로 실패한다 — 이 경우 지도 탭으로 보낸다.
    if (this.router.canGoBack()) {
      this.router.back();
    } else {
      this.router.replace('/map');
    }
  }

  // 공유(CS-7): 박지 웹 랜딩 URL을 OS 공유 시트로 내보낸다.
  // 랜딩(useless.my/camp-share/{id})에서 앱으로 딥링크(lessismoreapp://camp-site/{id})된다.
  public async share() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    this.analyticsManager?.logClick('camp_site_share');

    // 문서 id에 콜론(예: curated:seokseongsan)이 들어가 있다. 메신저의 URL 자동 링크화가
    // 콜론에서 끊겨 링크가 깨지므로 퍼센트 인코딩(%3A)한다 — 웹 랜딩(React Router)이 복원한다.
    const url = `https://useless.my/camp-share/${encodeURIComponent(spot.id)}`;

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

    // 설정한 배낭으로 바로 이동할 수 있게 토스트에 액션을 넣는다(CS-5).
    // Android는 네이티브 토스트라 버튼 미지원 — 메시지만 표시된다.
    this.toastManager.show({
      message: '여행지로 설정했어요.',
      buttonText: '이동',
      onButtonPress: () => {
        this.router.push(`/bag/${bag.getID()}`);
      },
    });
    this.closeBagSheet();
  }
}

export default CampSiteDetail;
