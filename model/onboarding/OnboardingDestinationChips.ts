import { doc, getDoc } from 'firebase/firestore';
import { makeAutoObservable, runInAction } from 'mobx';
import Firebase from '../firebase/Firebase';
import CampSpotStore from '../store/CampSpotStore';
import { CampSpot } from '../camp-site/CampSpotTypes';

// config/onboarding-destinations 문서 스키마(DataModel DM-36). 앱은 spotIds만 읽는다.
interface OnboardingDestinationsConfig {
  spotIds?: unknown;
}

// 문서는 최대 12개를 담고, 앱은 active인 것 중 앞에서 이만큼만 그린다(OB-5, DM-36).
const MAX_DESTINATION_CHIPS = 8;
const MAX_SPOT_IDS = 12;
const ACTIVE_STATUS = 'active';

/**
 * 첫 여행 가이드 2단계 `요즘 많이 가는 박지` 칩 목록(OB-5).
 *
 * 가이드가 열릴 때 1회 읽고 세션 동안 유지한다. 문서 없음·빈 배열·읽기 실패·남은 박지 0개는
 * 모두 빈 목록이다 — 화면은 구획을 그리지 않는다(킬 스위치를 겸함). 쓰기 없음.
 */
class OnboardingDestinationChips {
  public static from(firebase: Firebase, campSpotStore: CampSpotStore | null) {
    return new OnboardingDestinationChips(firebase, campSpotStore);
  }

  private spots: CampSpot[] = [];
  private requested = false;

  private constructor(
    private readonly firebase: Firebase,
    private readonly campSpotStore: CampSpotStore | null
  ) {
    makeAutoObservable<
      OnboardingDestinationChips,
      'firebase' | 'campSpotStore'
    >(this, { firebase: false, campSpotStore: false });
  }

  public getSpots(): CampSpot[] {
    return this.spots;
  }

  public async load(): Promise<void> {
    const store = this.campSpotStore;

    if (this.requested || !store) {
      return;
    }

    this.requested = true;

    try {
      const spotIds = await this.readSpotIds();

      if (spotIds.length === 0) {
        return;
      }

      // 박지마다 따로 받아 하나가 실패해도 나머지는 그린다(OB §4 — 실패한 것은 뺀다).
      const results = await Promise.allSettled(
        spotIds.map(id => store.getSpot(id))
      );
      const spots = results
        .map(result => (result.status === 'fulfilled' ? result.value : null))
        .filter(
          (spot): spot is CampSpot =>
            spot !== null && spot.status === ACTIVE_STATUS
        )
        .slice(0, MAX_DESTINATION_CHIPS);

      runInAction(() => {
        this.spots = spots;
      });
    } catch (error) {
      console.warn('첫 여행 가이드 인기 박지 조회 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  private async readSpotIds(): Promise<string[]> {
    const snapshot = await getDoc(
      doc(this.firebase.getStore(), 'config', 'onboarding-destinations')
    );

    if (!snapshot.exists()) {
      return [];
    }

    const { spotIds } = snapshot.data() as OnboardingDestinationsConfig;

    if (!Array.isArray(spotIds)) {
      return [];
    }

    const ids = spotIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );

    return Array.from(new Set(ids)).slice(0, MAX_SPOT_IDS);
  }
}

export default OnboardingDestinationChips;
