import { makeAutoObservable, reaction } from 'mobx';
import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';
import { loadHomeRecordSources } from '@/model/home/HomeRecordSources';
import BagStore from '@/model/store/BagStore';
import GearStore from '@/model/store/GearStore';
import Firebase from '@/model/firebase/Firebase';
import app from '@/model/app/App';

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
    return new Home(app.getBagStore()!, app.getGearStore()!, app.getFirebase());
  }

  private bags: BagItem[] = [];
  private gears: Gear[] = [];
  // 첫 진입에는 스켈레톤이 보여야 하므로 true로 시작한다(HM-6).
  private loading = true;
  private readonly disposeLoginReaction: () => void;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly firebase: Firebase
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
   * 배낭·장비를 함께 읽는다. 조회 자체는 정보 탭(AU-4)과 공유하는
   * `loadHomeRecordSources`가 맡는다 — 두 화면의 수가 어긋나지 않으려면 같은 인자로
   * 같은 쿼리를 내야 한다.
   */
  public async load() {
    if (!this.firebase.isLoggedIn()) {
      this.setBags([]);
      this.setGears([]);
      this.setLoading(false);

      return;
    }

    // 이미 내용이 있으면(재포커스) 스켈레톤으로 되돌리지 않는다 — 깜빡임 방지.
    if (this.bags.length === 0 && this.gears.length === 0) {
      this.setLoading(true);
    }

    const { bags, gears } = await loadHomeRecordSources(
      this.bagStore,
      this.gearStore
    );

    this.setBags(bags);
    this.setGears(gears);
    this.setLoading(false);
  }

  public getBags() {
    return this.bags;
  }

  public getGears() {
    return this.gears;
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

  private setLoading(value: boolean) {
    this.loading = value;
  }

  // 로그인 상태 reaction을 들고 있으므로 화면 언마운트 시 정리한다.
  public dispose() {
    this.disposeLoginReaction();
  }
}

export default Home;
