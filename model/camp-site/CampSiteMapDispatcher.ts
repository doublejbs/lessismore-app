import app from '../app/App';
import CampSpotStore from '../store/CampSpotStore';
import { CampSpot } from './CampSpotTypes';

// CampSiteMap 도메인의 데이터 액세스 위임 (CS-1). 읽기 전용 CampSpotStore 만 호출한다.
class CampSiteMapDispatcher {
  public static new() {
    return new CampSiteMapDispatcher(app.getCampSpotStore()!);
  }

  private constructor(private readonly campSpotStore: CampSpotStore) {}

  public async getActiveSpots(): Promise<CampSpot[]> {
    return await this.campSpotStore.getActiveSpots();
  }
}

export default CampSiteMapDispatcher;
