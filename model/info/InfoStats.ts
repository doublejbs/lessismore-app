import { makeAutoObservable, reaction } from 'mobx';
import app from '@/model/app/App';
import Firebase from '@/model/firebase/Firebase';
import { loadHomeRecordSources } from '@/model/home/HomeRecordSources';
import {
  getHomeRecordSummary,
  HomeRecordSummary,
} from '@/model/home/HomeRecordSummary';
import BagStore from '@/model/store/BagStore';
import GearStore from '@/model/store/GearStore';

/**
 * 정보 탭 프로필 카드의 지표 3개(장비 · 여행 · 안 쓴 장비)를 읽는다(AU-4).
 *
 * **새 컬렉션도 새 쿼리 형태도 만들지 않는다** — 홈(HM-7)과 같은 조회(`loadHomeRecordSources`)를
 * 그대로 내고, 세는 일도 홈이 쓰는 순수 함수(`getHomeRecordSummary`)에 맡긴다. 안 쓴 장비
 * 판정은 창고 필터(WH-2-1)와 같은 기준이어야 하므로 이 계산을 여기서 다시 쓰지 않는다 —
 * 세 자리(홈·창고·정보)의 수가 어긋나면 사용자가 어느 쪽을 믿어야 할지 알 수 없다.
 */
class InfoStats {
  public static new() {
    return new InfoStats(
      app.getBagStore()!,
      app.getGearStore()!,
      app.getFirebase()
    );
  }

  /**
   * `null`은 "아직 없음"이다 — 첫 진입(셔머 중)과 미로그인 둘 다 여기 해당하고, 화면은
   * 그 둘을 로그인 여부로 갈라 그린다. 별도 `loading` 플래그를 두지 않는 이유이기도 하다:
   * 값이 있으면 그리고 없으면 셔머라, 플래그가 하나 더 있으면 두 값이 어긋날 수 있다.
   */
  private summary: HomeRecordSummary | null = null;
  /**
   * 진행 중인 조회의 세대. 화면 포커스와 로그인 상태 reaction이 겹쳐 `load()`가 두 번 뜨면
   * **늦게 끝난 쪽이 먼저 끝난 쪽을 덮는다** — 로그아웃 직후 이전 계정 지표가 다시 들어오는
   * 경합이라, 결과를 쓰기 전에 자기 세대가 아직 최신인지 확인한다.
   * 화면에 그리는 값은 아니지만 증가를 액션(`issueLoadToken`) 안에서만 하므로 그대로 둔다.
   */
  private loadToken = 0;
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
   * 배낭·장비를 함께 읽는다. 조회는 홈(HM-7)과 공유하는 `loadHomeRecordSources`가 맡는다 —
   * 같은 인자로 같은 쿼리를 내야 두 화면의 수가 같다.
   */
  public async load() {
    const token = this.issueLoadToken();

    if (!this.firebase.isLoggedIn()) {
      this.setSummary(null);

      return;
    }

    // 이미 값이 있으면(재포커스) 지우지 않는다 — 셔머로 되돌아가 깜빡인다.
    const { bags, gears } = await loadHomeRecordSources(
      this.bagStore,
      this.gearStore
    );

    if (token !== this.loadToken) {
      return;
    }

    this.setSummary(getHomeRecordSummary(gears, bags));
  }

  private issueLoadToken() {
    this.loadToken += 1;

    return this.loadToken;
  }

  public getSummary() {
    return this.summary;
  }

  private setSummary(value: HomeRecordSummary | null) {
    this.summary = value;
  }

  // 로그인 상태 reaction을 들고 있으므로 화면 언마운트 시 정리한다.
  public dispose() {
    this.disposeLoginReaction();
  }
}

export default InfoStats;
