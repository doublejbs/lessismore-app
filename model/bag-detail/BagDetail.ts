import dayjs from 'dayjs';
import { makeAutoObservable, reaction } from 'mobx';
import app from '@/model/app/App';
import BagStore from '@/model/store/BagStore';
import Firebase from '@/model/firebase/Firebase';
import GearStore from '@/model/store/GearStore';
import Gear from '@/model/gear/Gear';
import Order from '@/model/order/Order';
import GearFilter from '@/model/gear/GearFilter';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagDetailFilterManager from '@/model/bag-detail/BagDetailFilterManager';
import PackingButtonState from '@/model/bag-detail/PackingButtonState';
import EmptyBagAddSource from '@/model/bag-detail/EmptyBagAddSource';
import { ImperativeRouter } from 'expo-router';
import BagWeather from '@/model/bag/BagWeather';
import { getPhaseLabel } from '@/model/bag/TripPhaseHelper';
import { BagActivitySummary } from '@/model/bag/BagActivitySummary';
import { setBagInfoEditContext } from '@/model/bag-detail/BagInfoEditHandoff';
import { getBagShareUrl } from '@/constants/WebLinks';
import Group from '@/model/group/Group';
import GroupBagLinkFlow from '@/model/group-bag-link/GroupBagLinkFlow';
import {
  BagScheduleChange,
  BagScheduleWriter,
} from '@/model/group-bag-link/GroupBagLinkTypes';
import { getGroupErrorMessage } from '@/model/group-error/GroupErrorMessage';
import BagDetailSource from '@/model/bag-detail/BagDetailSource';
import NetworkStatus from '@/model/offline/NetworkStatus';
import OfflineTrip from '@/model/offline/OfflineTrip';
import OfflineTripAccess from '@/model/offline/OfflineTripAccess';
import OfflineTripStore from '@/model/offline/OfflineTripStore';
import { OfflineTripSnapshotData } from '@/model/offline/OfflineTripSnapshot';
import { formatOfflineDate } from '@/model/offline/OfflineFormat';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import BagRouteDispatcher from '@/model/bag-route/BagRouteDispatcher';
import BagRouteList from '@/model/bag-route/BagRouteList';

class BagDetail implements BagScheduleWriter {
  public static readonly ORDER_KEY = 'bag';

  public static from(router: ImperativeRouter, id: string) {
    return new BagDetail(
      router,
      id,
      app.getBagStore()!,
      app.getGearStore()!,
      BagDetailFilterManager.from(),
      Order.new(BagDetail.ORDER_KEY),
      app.getFirebase(),
      GroupBagLinkFlow.new(),
      app.getNetworkStatus(),
      app.getOfflineTripStore(),
      OfflineTrip.from(id),
      BagRouteList.from(BagRouteDispatcher.new(), id)
    );
  }

  private name: string = '';
  private weight: string = '';
  private gears: Gear[] = [];
  private toAddGears: Gear[] = [];
  private warehouseVisible = false;
  private searchVisible = false;
  private initialized = false;
  private editDate = dayjs();
  private usedWeight = 0;
  private uselessChecked = false;
  private loading = false;
  private startDate = dayjs();
  private endDate = dayjs();
  private shared = false;
  private memo: string = '';
  // 배낭에 연결된 운동 기록 요약(DM-22). 타일 부제 표시용이며 원본은 담지 않는다(HA-5).
  private activity: BagActivitySummary | null = null;
  // 저장본(OF-5)으로 그릴 때의 코스 요약(BD-10·BD-11). 온라인은 `routeList`가 센다.
  private routeCount = 0;
  private routeDistance = 0;
  // 지금 읽고 있는 코스 조회 — 겹친 요청(마운트·네트워크 감시·포커스)은 이것을 함께 기다린다. 끝나면 비운다.
  private routesLoading: Promise<void> | null = null;
  // 코스 타일 부제의 지도 포인트 수(BD-14). 0이면 부제에서 뺀다.
  private pointCount = 0;
  private readonly bagWeather: BagWeather;
  private categoryRefs: Map<string, any> = new Map();
  private scrollViewRef: any = null;
  private isScrollingSyncFilter = false;
  private filterScrollViewRef: any = null;
  private filterButtonRefs: Map<string, any> = new Map();
  private gearHeaderHeight = 0;
  // iOS 투명 헤더 높이(insets.top + 44) — 뷰가 주입. Android/Web은 0.
  private topContentInset = 0;
  private packedCount = 0;
  private packingCompleted = false;
  private packingStarted = false;
  // 빈 배낭일 때만 채운다(BD-13) — 창고도 비었으면 주 액션이 검색으로 간다.
  private warehouseEmpty = false;
  // 헤더 그룹 한 줄(BD-1). 이 배낭이 연결된 그룹 — 여럿이면(2026-09-23 이전 연결) 출발일이 가장 가까운 하나.
  private linkedGroup: Group | null = null;
  // `⋯` → 그룹에 연결 시트의 목록(진행 중·예정 그룹).
  private linkableGroups: Group[] = [];
  // OF-5: 지금 화면을 그린 데이터(서버·저장본·없음)와, 저장본으로 열 수 없을 때의 이유.
  private source = BagDetailSource.Server;
  private offlineAccess = OfflineTripAccess.Online;
  // 저장본으로 그렸을 때 그 저장 시각(상단 띠 `오프라인 · 10.09 저장본`).
  private snapshotSavedAt: string | null = null;
  // 오프라인 상세 열람 측정(`offline_trip_open`)은 화면 한 번에 한 번만 남긴다 — 포커스마다 다시 그린다.
  private offlineOpenLogged = false;
  private disposeNetworkReaction: (() => void) | null = null;

  private constructor(
    private readonly router: ImperativeRouter,
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly filterManager: BagDetailFilterManager,
    private readonly order: Order,
    private readonly firebase: Firebase,
    private readonly linkFlow: GroupBagLinkFlow,
    private readonly networkStatus: NetworkStatus,
    private readonly offlineTripStore: OfflineTripStore | null,
    private readonly offlineTrip: OfflineTrip,
    /**
     * 코스 목록(BD-11) — 코스 화면과 **같은 모델**이라 연결 그룹 코스·중복 접기·선택 기억(`bagRoute.selected.{bagId}`)이
     * 같은 규칙이다. 여행 상세는 보기만 한다(코스 카드·상황형 강조 — RD-9 #4·#5).
     */
    private readonly routeList: BagRouteList
  ) {
    this.bagWeather = BagWeather.of(id, bagStore);
    makeAutoObservable<
      BagDetail,
      | 'networkStatus'
      | 'offlineTripStore'
      | 'disposeNetworkReaction'
      | 'routeList'
      | 'routesLoading'
    >(this, {
      networkStatus: false,
      offlineTripStore: false,
      disposeNetworkReaction: false,
      routeList: false,
      routesLoading: false,
    });
  }

  /**
   * OF-3: 연결이 바뀌면 상세를 다시 그린다 — 돌아오면 서버 데이터로, 끊기면 저장본으로. `initialized`를
   * 그대로 둔 채 데이터만 바꿔 스켈레톤으로 돌아가지 않는다(스크롤 위치 유지). 래퍼가 마운트 동안 건다.
   */
  public startNetworkWatch(): void {
    if (this.disposeNetworkReaction) {
      return;
    }

    this.disposeNetworkReaction = reaction(
      () => this.networkStatus.isOffline(),
      () => {
        if (this.initialized) {
          void this.initialize();
        }
      }
    );
  }

  public dispose(): void {
    this.disposeNetworkReaction?.();
    this.disposeNetworkReaction = null;
  }

  public getOfflineTrip() {
    return this.offlineTrip;
  }

  public getSource() {
    return this.source;
  }

  // 저장본으로 그린 상세인지(OF-5 상단 띠·액션 그리드 축소).
  public isSnapshot() {
    return this.source === BagDetailSource.Snapshot;
  }

  // 오프라인이라 열 저장본이 없다(OF-5 `이 여행은 저장되지 않았어요` · OF-7 잠김).
  public isUnavailable() {
    return this.source === BagDetailSource.Unavailable;
  }

  public getOfflineAccess() {
    return this.offlineAccess;
  }

  // 상단 띠의 저장 날짜(`10.09`).
  public getSnapshotDateLabel() {
    return this.snapshotSavedAt ? formatOfflineDate(this.snapshotSavedAt) : '';
  }

  // 편집을 막아야 하는지(OF-5) — 연결이 없으면 장비·메모·여행지·공유·복사·추가를 막는다. 패킹은 예외다.
  public isReadOnly() {
    return this.networkStatus.isOffline();
  }

  /**
   * 편집 동작 앞에 둔다(OF-5). 오프라인이면 토스트 `온라인에서 할 수 있어요`를 띄우고 false.
   */
  public guardOnline(): boolean {
    if (!this.isReadOnly()) {
      return true;
    }

    app.getToastManager()?.showSimple(app.getL10n().t('offline.toast.onlineOnly'));

    return false;
  }

  public getBagWeather() {
    return this.bagWeather;
  }

  private setActivity(value: BagActivitySummary | null) {
    this.activity = value;
  }

  public getActivity() {
    return this.activity;
  }

  /**
   * 코스 수(BD-10·BD-11) — 온라인은 내 코스 + 연결 그룹 코스(중복 접기 반영, 코스 화면 목록과 같은 수), 저장본은
   * 저장해 둔 내 코스 수다. 저장본은 바꾸지 않는다(OF-5) — 오프라인 상세는 그리드가 그대로고 코스 카드·강조를 쓰지
   * 않으며, 타일 부제는 저장본이 담은 범위(내 코스)를 그대로 센다.
   */
  public getRouteCount() {
    if (this.isSnapshot()) {
      return this.routeCount;
    }

    return this.routeList.getEntries().length;
  }

  // 코스 총 거리(m) — 세는 범위는 `getRouteCount`와 같다.
  public getRouteDistance() {
    if (this.isSnapshot()) {
      return this.routeDistance;
    }

    return this.routeList
      .getEntries()
      .reduce((sum, entry) => sum + entry.route.getDistance(), 0);
  }

  /**
   * 코스를 한 번이라도 다 읽었는지(RD-9 #4·#5) — 읽기 전에는 지금까지의 그리드(여행지 강조 + 코스 타일)로 둔다.
   * 목록 모델의 첫 조회 완료가 기준이다(저장본은 이미 담겨 있다). 다시 읽는 동안에는 이전 결과·오류가 그대로다.
   */
  public isRoutesLoaded() {
    return this.isSnapshot() || this.routeList.isInitialized();
  }

  /**
   * 코스 카드(RD-9 #5)의 대표 코스 — 코스 화면에서 고른 코스(BD-11 선택 기억), 없으면 첫 코스. 코스 화면과 같은
   * 판단(`BagRouteList` 선택 규칙)이다. 코스가 없으면 `null`.
   */
  public getRepresentativeRoute(): BagRouteEntry | null {
    return (
      this.routeList.getSelectedEntry() ??
      this.routeList.getEntries()[0] ??
      null
    );
  }

  public getPointCount() {
    return this.pointCount;
  }

  public async initialize() {
    this.order.initialize();

    if (this.networkStatus.isOffline()) {
      await this.loadSnapshot();
    } else {
      try {
        await this.getData();
        this.setSource(BagDetailSource.Server);
        this.networkStatus.markFirestoreSuccess();
        // OF-2: 저장된 여행이면 온라인 진입마다 조용히 갱신한다.
        this.offlineTrip.refreshSilently();
      } catch (error) {
        // OF-3: 연결 상태를 아직 모르는데 읽기가 연결 없음으로 실패했다 → 오프라인으로 보고 저장본을 연다.
        if (
          this.networkStatus.markFirestoreFailure(error) &&
          this.networkStatus.isOffline()
        ) {
          await this.loadSnapshot();
        } else {
          throw error;
        }
      }
    }

    this.filterManager.selectFirstFilter();
    this.setInitialized(true);
  }

  /**
   * 오프라인 상세 (OF-5). 저장본으로 요약·장비·메모·여행지·날씨·패킹·코스 요약을 그린다 — Firestore를
   * 읽지 않는다. 열 수 없으면(미저장·구독 만료·갱신 필요) `Unavailable`로 두고 화면이 빈 상태를 그린다.
   */
  private async loadSnapshot() {
    const access = this.offlineTripStore?.getAccess(this.id) ?? OfflineTripAccess.NotSaved;
    const snapshot =
      access === OfflineTripAccess.Available
        ? await this.offlineTripStore?.load(this.id)
        : null;

    if (!snapshot) {
      // 온라인에서 이미 서버 데이터로 그리고 있다가 연결이 끊겼으면 그 화면을 그대로 둔다(편집만 막힌다) —
      // 보고 있던 장비 목록이 빈 상태로 바뀌면 안 된다. 처음부터 오프라인으로 열었을 때만 빈 상태다.
      if (this.initialized && this.source === BagDetailSource.Server) {
        return;
      }

      this.setOfflineAccess(
        access === OfflineTripAccess.Available ? OfflineTripAccess.NotSaved : access
      );
      this.setSource(BagDetailSource.Unavailable);

      return;
    }

    this.applySnapshot(snapshot);
    this.setOfflineAccess(OfflineTripAccess.Available);
    this.setSource(BagDetailSource.Snapshot);

    if (!this.offlineOpenLogged) {
      this.setOfflineOpenLogged(true);
      app.getAnalyticsManager()?.logEvent('offline_trip_open');
    }
  }

  private setOfflineOpenLogged(value: boolean) {
    this.offlineOpenLogged = value;
  }

  private applySnapshot(snapshot: OfflineTripSnapshotData) {
    const { bag } = snapshot;

    this.setName(bag.name);
    this.setWeight(bag.weight);
    this.setEditDate(bag.editDate);
    this.setGears(this.bagStore.toOwnedGearsFromData(snapshot.gears));
    this.setWarehouseEmpty(false);
    this.setStartDate(bag.startDate);
    this.setEndDate(bag.endDate);
    this.setShared(false);
    this.setMemo(bag.memo || '');
    this.setActivity(null);
    this.calculateUsedWeight();
    this.updateUselessChecked();
    this.applyPackingState(bag);
    // 날씨는 저장 시점의 스냅샷 그대로다 — 오프라인에서는 다시 조회하지 않는다.
    this.bagWeather.hydrate(
      bag.location,
      bag.weather,
      this.startDate,
      this.endDate
    );
    this.setRouteSummary(
      snapshot.routes.length,
      snapshot.routes.reduce((sum, route) => sum + route.distance, 0)
    );
    this.setPointCount(snapshot.points.length);
    this.setLinkedGroup(null);
    this.setSnapshotSavedAt(snapshot.savedAt);
  }

  private setSource(value: BagDetailSource) {
    this.source = value;
  }

  private setOfflineAccess(value: OfflineTripAccess) {
    this.offlineAccess = value;
  }

  private setSnapshotSavedAt(value: string | null) {
    this.snapshotSavedAt = value;
  }

  private async getData() {
    const {
      name,
      weight,
      editDate,
      gears,
      startDate,
      endDate,
      shared,
      memo,
      location,
      weather,
      activity,
    } = await this.bagStore.getBagWithAllFilter(this.id);
    this.setName(name);
    this.setWeight(weight);
    this.setEditDate(editDate);
    this.setGears(gears);
    // 라벨이 초기화 뒤에 바뀌어 튀지 않도록 첫 렌더 전에 기다린다. 빈 배낭에서만 1건 읽는다.
    await this.loadWarehouseState();
    this.setStartDate(startDate);
    this.setEndDate(endDate);
    this.setShared(shared);
    this.setMemo(memo || '');
    this.setActivity(activity);
    this.calculateUsedWeight();
    this.updateUselessChecked();
    await this.loadPackingState();
    // 이미 읽은 배낭 데이터를 BagWeather에 주입하고(중복 읽기 방지),
    // 날씨는 부가정보라 초기화를 막지 않도록 비동기로만 신선도 갱신한다.
    this.bagWeather.hydrate(
      location ?? null,
      weather ?? null,
      this.startDate,
      this.endDate
    );
    void this.bagWeather.ensureFresh();
    // 연결 그룹 목록은 한 번만 읽어 그룹 한 줄과 코스(연결 그룹 코스)가 나눠 쓴다.
    const linkedGroups = this.fetchLinkedGroups();

    // 코스는 부가 정보라 초기화를 막지 않는다(BD-11 · RD-9 #4·#5).
    void this.loadRoutes(linkedGroups);
    void this.loadPointCount();
    // 그룹 한 줄도 부가 정보다. 화면에 돌아올 때마다(initialize) 다시 읽어 그룹에서 바꾼 연결을 반영한다.
    void this.loadLinkedGroup(linkedGroups);
  }

  private async loadWarehouseState() {
    if (this.gears.length > 0) {
      this.setWarehouseEmpty(false);

      return;
    }

    try {
      this.setWarehouseEmpty(!(await this.gearStore.hasAnyGear()));
    } catch (error) {
      // 실패하면 기존 동작(편집 화면)으로 둔다.
      console.warn('[BagDetail] 창고 조회 실패', error); // l10n-ignore: 개발자 로그
      this.setWarehouseEmpty(false);
    }
  }

  private setWarehouseEmpty(value: boolean) {
    this.warehouseEmpty = value;
  }

  // 담긴 장비가 없는 배낭(BD-13).
  public isEmpty() {
    return this.gears.length === 0;
  }

  public getEmptyAddSource(): EmptyBagAddSource {
    if (this.warehouseEmpty) {
      return EmptyBagAddSource.Search;
    }

    return EmptyBagAddSource.Warehouse;
  }

  // 빈 배낭의 주 액션 — 창고에 장비가 있으면 편집(BD-4), 없으면 이 배낭 컨텍스트의 검색 모달(GE-8).
  public goToEmptyAdd() {
    if (!this.guardOnline()) {
      return;
    }

    if (this.getEmptyAddSource() === EmptyBagAddSource.Search) {
      this.router.push(`/search?bagId=${this.getId()}`);

      return;
    }

    this.goToEdit();
  }

  /**
   * 그룹 카드 (BD-1). 역인덱스(`users/{uid}/groups`)를 `bagId`로 찾아 카드를 먼저 그리고,
   * 이어서 그룹 문서 1건을 읽어 코스·포인트 캐시 수(역인덱스에 없다)와 최신 멤버 수로 바꾼다.
   * 역인덱스 조회가 실패하면 카드를 그리지 않는다(혼자 가는 배낭과 같다).
   */
  /**
   * `linkedGroups`: 이미 읽고 있는 연결 그룹 목록(`fetchLinkedGroups` — 코스 조회와 나눠 쓴다). 없으면 새로 읽는다.
   * 목록 조회가 실패하면(`null`) 그룹 한 줄을 그대로 둔다.
   */
  public async loadLinkedGroup(
    linkedGroups: Promise<Group[] | null> = this.fetchLinkedGroups()
  ): Promise<void> {
    if (!this.firebase.isLoggedIn()) {
      this.setLinkedGroup(null);

      return;
    }

    try {
      const groups = await linkedGroups;

      if (!groups) {
        return;
      }

      const nearest = this.pickNearestGroup(groups);

      this.setLinkedGroup(nearest);

      if (nearest) {
        await this.loadLinkedGroupDocument(nearest.getId());
      }
    } catch (error) {
      console.warn('[BagDetail] 연결 그룹 조회 실패', error); // l10n-ignore: 개발자 로그
    }
  }

  // 이 배낭을 연결한 그룹 목록. 비로그인이면 빈 목록, 조회 실패면 `null`(그룹 한 줄은 그대로, 코스는 그룹 없이).
  private async fetchLinkedGroups(): Promise<Group[] | null> {
    if (!this.firebase.isLoggedIn()) {
      return [];
    }

    try {
      return (await app.getGroupStore()?.getGroupsByBag(this.id)) ?? [];
    } catch (error) {
      console.warn('[BagDetail] 연결 그룹 조회 실패', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }

  // 그룹 문서 읽기가 실패하면 요약본을 그대로 둔다 — 카드는 코스·포인트 조각만 빠진 채 남는다.
  private async loadLinkedGroupDocument(groupId: string): Promise<void> {
    try {
      const group = await app.getGroupStore()?.getGroup(groupId);

      // 읽는 사이 연결이 바뀌었으면(해제·다른 그룹) 덮어쓰지 않는다.
      if (group && this.linkedGroup?.getId() === groupId) {
        this.setLinkedGroup(group);
      }
    } catch (error) {
      console.warn('[BagDetail] 연결 그룹 문서 조회 실패', error); // l10n-ignore: 개발자 로그
    }
  }

  // 출발일이 오늘과 가장 가까운 그룹(GRP-5 — 한 배낭 = 한 그룹 결정 이전의 다중 연결).
  private pickNearestGroup(groups: Group[]): Group | null {
    const today = dayjs().startOf('day');
    const distance = (group: Group) =>
      Math.abs(dayjs(group.getStartDate()).startOf('day').diff(today, 'day'));

    return (
      [...groups].sort((a, b) => {
        const diff = distance(a) - distance(b);

        if (diff !== 0) {
          return diff;
        }

        return a.getStartDate().localeCompare(b.getStartDate());
      })[0] ?? null
    );
  }

  private setLinkedGroup(value: Group | null) {
    this.linkedGroup = value;
  }

  public getLinkedGroup() {
    return this.linkedGroup;
  }

  public goToLinkedGroup() {
    const group = this.linkedGroup;

    if (!this.guardOnline()) {
      return;
    }

    if (!group) {
      return;
    }

    this.router.push({ pathname: '/group/[id]', params: { id: group.getId() } });
  }

  // 그룹 카드의 `그룹 지도` 알약 (BD-1).
  public goToLinkedGroupMap() {
    const group = this.linkedGroup;

    if (!this.guardOnline()) {
      return;
    }

    if (!group) {
      return;
    }

    this.router.push({
      pathname: '/group/[id]/map',
      params: { id: group.getId() },
    });
  }

  /**
   * `⋯` → 그룹에 연결 시트 목록 (BD-1). 진행 중·예정 그룹만 — 지난 그룹은 뺀다.
   * 성공하면 true(목록이 비어도 true — 시트가 `참여한 그룹이 없어요`를 보여준다).
   */
  public async loadLinkableGroups(): Promise<boolean> {
    try {
      const groups = (await app.getGroupStore()?.getMyGroups()) ?? [];

      this.setLinkableGroups(groups.filter(group => !group.isPast()));

      return true;
    } catch (error) {
      app.getToastManager()?.showSimple(getGroupErrorMessage(error));

      return false;
    }
  }

  private setLinkableGroups(value: Group[]) {
    this.linkableGroups = value;
  }

  public getLinkableGroups() {
    return this.linkableGroups;
  }

  // 배낭 쪽에서 그룹에 연결 (BD-1). 한 그룹 제약·일정 맞춤 확인은 그룹 상세와 같은 흐름을 거친다(GRP-5).
  public async linkToGroup(group: Group): Promise<void> {
    await this.linkFlow.start({
      group,
      subject: {
        bagId: this.id,
        startDate: this.startDate,
        endDate: this.endDate,
        location: this.bagWeather.getLocation(),
      },
      writer: this,
      confirmReplace: true,
      onLinked: () => {
        app.getAnalyticsManager()?.logClick('bag_group_link');
      },
      onChanged: () => this.loadLinkedGroup(),
    });
  }

  // 그룹 연결 해제 (BD-1). 스냅샷이 사라지는 동작이라 destructive 확인을 거친다.
  public confirmUnlinkGroup() {
    const group = this.linkedGroup;

    if (!group) {
      return;
    }

    const l10n = app.getL10n();

    app.getAlertManager()?.show({
      message: l10n.t('bag.group.unlinkConfirm', { name: group.getName() }),
      confirmText: l10n.t('bag.group.unlink'),
      cancelText: l10n.t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        await this.unlinkGroup(group);
      },
    });
  }

  private async unlinkGroup(group: Group) {
    try {
      await app.getGroupStore()!.unlinkBag(group.getId());
      app.getAnalyticsManager()?.logClick('bag_group_unlink');
    } catch (error) {
      app.getToastManager()?.showSimple(getGroupErrorMessage(error));
    }

    await this.loadLinkedGroup();
  }

  /**
   * 그룹 일정으로 맞추기 (GRP-5). 새 쓰기 경로를 만들지 않는다 — 기간은 배낭 정보 수정의
   * `updateDates`(상태·날씨 기간까지 함께 맞춘다), 여행지는 여행지 허브와 같은 `BagWeather.updateLocation`(DST-6).
   * 기간을 먼저 써서 여행지 날씨가 바뀐 기간으로 조회되게 한다.
   */
  public async applySchedule(change: BagScheduleChange): Promise<void> {
    if (change.dates) {
      await this.updateDates(change.dates.startDate, change.dates.endDate);
    }

    if (change.location) {
      await this.bagWeather.updateLocation(change.location);
    }
  }

  /**
   * 코스 조회 (BD-11 · RD-9 #4·#5). 코스 화면과 같은 목록 모델로 내 코스 + 연결 그룹 코스를 읽는다 — 코스 카드가
   * 대표 코스의 선(축약 좌표)·이름·거리·상승을 그리므로 문서를 그대로 읽는다(배낭·그룹당 5개 상한이라 읽는 양이
   * 정해져 있다). 화면을 막지 않도록 기다리지 않고 배경으로 돌리고, 포커스마다 다시 읽어 코스 화면에서 고른 코스를
   * 따라간다. 실패하면 목록 모델이 오류를 들고 있고(`hasRouteError`) 화면은 강조·코스 카드를 고르지 않는다.
   *
   * 이미 읽는 중이면 그 조회를 함께 기다린다 — 마운트·네트워크 감시가 겹쳐 같은 순간에 두 번 읽지 않게(시간으로
   * 건너뛰지 않는다 — 포커스 복귀·장비 변경 뒤에는 늘 다시 읽는다). 연결 그룹 목록은 그룹 한 줄과 같은 조회 결과를
   * 받는다(실패면 그룹 없이 내 코스만).
   */
  private loadRoutes(linkedGroups: Promise<Group[] | null>): Promise<void> {
    if (this.routesLoading) {
      return this.routesLoading;
    }

    const loading = (async () => {
      try {
        await this.routeList.reload(linkedGroups.then(groups => groups ?? []));
      } catch (error) {
        console.warn('[BagDetail] 코스 조회 실패', error); // l10n-ignore: 개발자 로그
      } finally {
        this.routesLoading = null;
      }
    })();

    this.routesLoading = loading;

    return loading;
  }

  // 코스 조회가 실패했는지 — 실패면 0개로 보고 `코스` 강조·코스 카드를 고르지 않는다(RD-9 #4·#5).
  public hasRouteError() {
    return !this.isSnapshot() && !!this.routeList.getError();
  }


  /**
   * 지도 포인트 수 조회 (BD-14). 타일 부제의 `포인트 {m}` 조각에만 쓴다 — 문서를 읽지 않고 개수만
   * 센다. 코스 요약과 같이 배경으로 돌리고, 실패하면 조각을 빼 둔다(부가 정보다).
   */
  private async loadPointCount() {
    try {
      const count = await app.getBagPointStore()!.getPointCount(this.id);

      this.setPointCount(count);
    } catch (error) {
      console.warn('[BagDetail] 포인트 수 조회 실패', error); // l10n-ignore: 개발자 로그
    }
  }

  private setPointCount(count: number) {
    this.pointCount = count;
  }

  private setRouteSummary(count: number, distance: number) {
    this.routeCount = count;
    this.routeDistance = distance;
  }

  private async loadPackingState() {
    this.applyPackingState(await this.bagStore.getPackingState(this.id));
  }

  private applyPackingState({
    packedGears,
    packingStartedAt,
    packingCompletedAt,
  }: {
    packedGears: string[];
    packingStartedAt?: string | undefined;
    packingCompletedAt?: string | undefined;
  }) {
    // 진행률·완료 판정은 현재 로드된 장비 기준(stale ID 무시).
    const loadedPackedCount = this.gears.reduce(
      (acc, gear) => (packedGears.includes(gear.getId()) ? acc + 1 : acc),
      0
    );

    this.setPackedCount(loadedPackedCount);
    this.setPackingCompleted(Boolean(packingCompletedAt));
    this.setPackingStarted(Boolean(packingStartedAt) || packedGears.length > 0);
  }

  private setPackedCount(value: number) {
    this.packedCount = value;
  }

  private setPackingCompleted(value: boolean) {
    this.packingCompleted = value;
  }

  private setPackingStarted(value: boolean) {
    this.packingStarted = value;
  }

  public getPackedCount() {
    return this.packedCount;
  }

  // 배낭에 담긴 장비가 있을 때만 플로팅 버튼을 노출한다(PK-1).
  public shouldShowPackingButton() {
    return this.gears.length > 0;
  }

  public getPackingButtonState(): PackingButtonState {
    if (this.packingCompleted) {
      return PackingButtonState.Completed;
    } else if (this.packingStarted && this.packedCount > 0) {
      return PackingButtonState.InProgress;
    } else {
      return PackingButtonState.None;
    }
  }

  // 출발까지 남은 일수(지났으면 음수).
  private getDDay() {
    return this.startDate.startOf('day').diff(dayjs().startOf('day'), 'day');
  }

  public goToPacking() {
    // OF-5: 오프라인 패킹은 열어 볼 수 있는 저장본에만 쓴다 — 저장본이 없거나 잠겼으면 열지 않는다.
    if (
      this.networkStatus.isOffline() &&
      this.offlineTripStore?.getAccess(this.id) !== OfflineTripAccess.Available
    ) {
      app.getToastManager()?.showSimple(app.getL10n().t('offline.toast.onlineOnly'));

      return;
    }

    app.getAnalyticsManager()?.logClick('packing_start', {
      gear_count: this.gears.length,
      d_day: this.getDDay(),
    });
    this.router.push(`/bag/${this.id}/packing`);
  }

  private updateUselessChecked() {
    this.setUselessChecked(
      this.gears.some(gear => gear.hasUseless(this.id) || gear.hasUsed(this.id))
    );
  }

  private calculateUsedWeight() {
    const usedWeight = this.gears.reduce(
      (acc: number, gear) =>
        gear.hasUsed(this.id) ? acc + Number(gear.getWeight()) : acc,
      0
    );
    this.setUsedWeight(usedWeight);
  }

  private setName(value: string) {
    this.name = value;
  }

  public getName() {
    return this.name;
  }

  private setWeight(value: string) {
    this.weight = value;
  }

  public getWeight() {
    return Math.round((Number(this.weight) / 1000) * 100) / 100;
  }

  // 베이스 무게(배낭/텐트/침낭/매트) — UL 핵심 지표. kg 반올림.
  private static readonly BASE_CATEGORIES: string[] = [
    GearFilter.Backpack,
    GearFilter.Tent,
    GearFilter.SleepingBag,
    GearFilter.Mat,
  ];

  public getBaseWeight() {
    const grams = this.gears
      .filter(gear =>
        BagDetail.BASE_CATEGORIES.includes(gear.getGroupCategory())
      )
      .reduce((acc, gear) => acc + Number(gear.getWeight()), 0);
    return Math.round((grams / 1000) * 100) / 100;
  }

  // 베이스를 제외한 나머지(휴대품·소모품 등) 무게. kg 반올림.
  public getRestWeight() {
    return Math.round((this.getWeight() - this.getBaseWeight()) * 100) / 100;
  }

  // 여행 상태: 출발 전 / 여행 중 / 지난 여행.
  public getTripPhase(): 'before' | 'ongoing' | 'after' {
    const today = dayjs().startOf('day');
    if (this.endDate.startOf('day').isBefore(today)) {
      return 'after';
    }
    if (this.startDate.startOf('day').isAfter(today)) {
      return 'before';
    }
    return 'ongoing';
  }

  // 날짜 부제에 붙일 상황 라벨(D-day / 여행 중 / 지난 여행). 그룹 상세 헤더(GRP-11)와 같은 단일 소스다.
  public getPhaseLabel(): string {
    return getPhaseLabel(this.startDate, this.endDate);
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  public getGears() {
    return this.gears;
  }

  private updateWeight() {
    const totalWeight = this.gears.reduce(
      (acc: number, gear) => acc + Number(gear.getWeight()),
      0
    );
    this.setWeight(totalWeight.toString());
  }

  public hasGearWith(id: string) {
    return this.gears.some(gear => gear.hasId(id));
  }

  public shouldShowWarehouse() {
    return this.warehouseVisible;
  }

  public shouldShowSearch() {
    return this.searchVisible;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public async toggleUseless(gear: Gear) {
    // OF-5: 사용 기록은 서버에 쓴다 — 연결이 없으면 막는다.
    if (!this.guardOnline()) {
      return;
    }

    if (this.isUseless(gear)) {
      await this.setUseful(gear);
    } else {
      await this.setUseless(gear);
    }
    await this.initialize();
  }

  private async setUseful(gear: Gear) {
    await this.gearStore.update(gear.removeUseless(this.id));
  }

  private async setUseless(gear: Gear) {
    await this.gearStore.update(gear.appendUseless(this.id));
  }

  public isUseless(gear: Gear) {
    return gear.hasUseless(this.id);
  }

  public getId() {
    return this.id;
  }

  private setEditDate(value: string) {
    this.editDate = dayjs(value);
  }

  public getEditDate() {
    return this.editDate;
  }

  public getCount() {
    return this.gears.length;
  }

  public showSearch() {
    this.router.push(`/bag/${this.id}/edit/search`);
  }

  public showWrite() {
    this.router.push(`/custom`);
  }

  /**
   * 배낭에서 장비를 뺀다(BD-1 스와이프 삭제).
   *
   * **되돌릴 수 없어 확인을 받는다**(2026-08-05 사용자 요청). 스와이프는 목록을 훑다가
   * 실수로 열리기 쉬운 제스처라, 누르는 즉시 사라지면 무엇이 빠졌는지도 모른 채 지나간다.
   * 창고의 장비 자체는 지우지 않으므로 안내 문구는 `삭제`가 아니라 `빼기`로 쓰고,
   * 확인 버튼은 `확인`으로 둔다(2026-08-05 사용자 결정).
   */
  public async delete(gear: Gear) {
    if (!this.guardOnline()) {
      return;
    }

    const name = gear.getDisplayName();

    app.getAlertManager()?.show({
      message: app.getL10n().t('bagDetail.removeConfirm', { name }),
      confirmText: app.getL10n().t('common.ok'),
      onConfirm: async () => {
        const filteredGears = this.gears.filter(g => !g.isSame(gear));

        await this.bagStore.save(
          this.id,
          this.toAddGears,
          [gear],
          filteredGears
        );
        this.setGears(filteredGears);
        this.updateWeight();
      },
    });
  }

  private setUsedWeight(value: number) {
    this.usedWeight = value;
  }

  public getUsedWeight() {
    return Math.round((Number(this.usedWeight) / 1000) * 100) / 100;
  }

  private setUselessChecked(value: boolean) {
    this.uselessChecked = value;
  }

  public isUselessChecked() {
    return this.uselessChecked;
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.selectFilter(filter);
    this.setLoading(false);
  }

  public async deselectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.deselectFilter(filter);
    this.setLoading(false);
  }

  public isLoading() {
    return this.loading;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.mapFilters(callback);
  }

  public mapFiltersWithGears<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.getFiltersWithGears(this.gears).map(callback);
  }

  public getCategoryName(category: GearFilter) {
    return this.filterManager.getCategoryName(category);
  }

  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      this.deselectFilter(filter);
    } else {
      this.selectFilter(filter);
    }
  }

  public mapGears<R>(callback: (gear: Gear) => R) {
    return this.gears
      .filter(gear => this.filterManager.hasFilter(gear.getGroupCategory()))
      .map(callback);
  }

  public getGearsByCategory() {
    return this.filterManager.groupGearsByCategory(this.gears);
  }

  private setStartDate(value: string) {
    this.startDate = dayjs(value);
  }

  public getStartDate() {
    return this.startDate;
  }

  private setEndDate(value: string) {
    this.endDate = dayjs(value);
  }

  public getEndDate() {
    return this.endDate;
  }

  public getDate() {
    if (this.startDate.isSame(this.endDate, 'day')) {
      return this.startDate.format(app.getL10n().t('bag.dateShortFormat'));
    } else {
      return `${this.startDate.format(app.getL10n().t('bag.dateShortFormat'))}${app.getL10n().t('bag.dateRangeSeparator')}${this.endDate.format(app.getL10n().t('bag.dateShortFormat'))}`;
    }
  }

  public back() {
    this.router.back();
  }

  public getOrder() {
    return this.order;
  }

  private setShared(value: boolean) {
    this.shared = value;
  }

  public isShared() {
    return this.shared;
  }

  public async share() {
    await this.bagStore.updateShared(this.id, this.firebase.getUserId(), true);
    this.setShared(true);
  }

  public async unshare() {
    await this.bagStore.updateShared(this.id, this.firebase.getUserId(), false);
    // React Native Alert을 컴포넌트에서 호출하도록 변경
    this.setShared(false);
  }

  private setMemo(value: string) {
    this.memo = value;
  }

  public getMemo() {
    return this.memo;
  }

  public hasMemo() {
    return this.memo.trim().length > 0;
  }

  public getUrl() {
    return getBagShareUrl(this.id);
  }

  public setActiveFilterByCategory(categoryFilter: GearFilter) {
    // 모든 필터를 비활성화
    this.filterManager.mapFilters(filter => filter.deselect());

    // 해당 카테고리 필터만 활성화
    this.filterManager.mapFilters(filter => {
      if (filter.isSame(categoryFilter)) {
        filter.select();
      }
    });
  }

  public clearAllFilters() {
    this.filterManager.mapFilters(filter => filter.deselect());
  }

  public setCategoryRefs(refs: Map<string, any>) {
    this.categoryRefs = refs;
  }

  // sticky 헤더(총 N개 + 필터 행) 실측 높이. 필터 칩 높이가 바뀌어도
  // 카테고리 스크롤 오프셋이 자동 보정되도록 실측값을 쓴다.
  public setGearHeaderHeight(height: number) {
    this.gearHeaderHeight = height;
  }

  // iOS 네이티브 투명 헤더(LG) 아래로 콘텐츠가 흐르는 화면에서, scrollTo 좌표와
  // 가시 영역 판정이 헤더 높이만큼 어긋나지 않도록 뷰가 주입하는 상단 인셋.
  // (스크롤 프레임 최상단 = 화면 최상단이 된 iOS에서만 > 0, Android/Web은 0.)
  public setTopContentInset(value: number) {
    this.topContentInset = value;
  }

  public setScrollViewRef(ref: any) {
    this.scrollViewRef = ref;
  }

  public setFilterScrollViewRef(ref: any) {
    this.filterScrollViewRef = ref;
  }

  public setFilterButtonRefs(refs: Map<string, any>) {
    this.filterButtonRefs = refs;
  }

  public scrollToCategory(categoryFilter: GearFilter) {
    const element = this.categoryRefs.get(categoryFilter);

    if (element && this.scrollViewRef) {
      // 프로그래밍 방식의 스크롤 동안 필터 동기화 비활성화
      this.isScrollingSyncFilter = true;

      try {
        element.measureLayout(
          this.scrollViewRef,
          (_x: number, y: number) => {
            // 실측한 sticky 헤더(총 N개 + 필터 행) 높이 아래로 카테고리 타이틀이 오도록
            // 오프셋을 준다. 필터 칩 높이가 바뀌어도 자동 보정된다(실측 전 폴백 106).
            // iOS는 스크롤 프레임이 화면 최상단부터라 투명 헤더 높이(topContentInset)도 더한다(LG).
            const stickyHeaderHeight =
              this.gearHeaderHeight > 0 ? this.gearHeaderHeight : 106;
            const gap = 12;

            const totalOffset = this.topContentInset + stickyHeaderHeight + gap;
            const adjustedY = Math.max(0, y - totalOffset);

            this.scrollViewRef.scrollTo({
              y: adjustedY,
              animated: true,
            });

            // 스크롤 애니메이션 완료 후 필터 동기화 재활성화
            setTimeout(() => {
              this.isScrollingSyncFilter = false;
            }, 500);
          },
          () => {
            // 측정 실패시 폴백 - measureInWindow 사용
            const isFirstCategory = categoryFilter === GearFilter.Backpack;
            const fallbackOffset = isFirstCategory ? 250 : 230;
            element.measureInWindow((_x: number, y: number) => {
              this.scrollViewRef.scrollTo({
                y: Math.max(0, y - fallbackOffset),
                animated: true,
              });

              // 스크롤 애니메이션 완료 후 필터 동기화 재활성화
              setTimeout(() => {
                this.isScrollingSyncFilter = false;
              }, 500);
            });
          }
        );
      } catch {
        // 에러 발생시 기본 measureInWindow 사용
        const isFirstCategory = categoryFilter === GearFilter.Backpack;
        const fallbackOffset = isFirstCategory ? 250 : 230;
        element.measureInWindow((_x: number, y: number) => {
          this.scrollViewRef.scrollTo({
            y: Math.max(0, y - fallbackOffset),
            animated: true,
          });

          // 스크롤 애니메이션 완료 후 필터 동기화 재활성화
          setTimeout(() => {
            this.isScrollingSyncFilter = false;
          }, 500);
        });
      }
    }
  }

  public scrollToFilter(filter: WarehouseFilter) {
      const element = this.filterButtonRefs.get(filter.getFilter());

    if (element && this.filterScrollViewRef) {
      // 약간의 지연을 두고 스크롤 (레이아웃이 완료된 후)
      setTimeout(() => {
        element.measureLayout(
          this.filterScrollViewRef,
          (x: number, _y: number, width: number) => {
            // ScrollView의 너비를 가져와서 버튼을 화면 중앙에 위치시킴
            this.filterScrollViewRef.measure(
              (_fx: number, _fy: number, scrollViewWidth: number) => {
                // 버튼을 화면 중앙에 위치시키기 위한 스크롤 위치 계산
                const centerOffset = (scrollViewWidth - width) / 2;
                const targetScrollX = x - centerOffset;

                this.filterScrollViewRef.scrollTo({
                  x: Math.max(0, targetScrollX),
                  animated: true,
                });
              }
            );
          },
          () => {
            // 측정 실패시 아무것도 하지 않음
          }
        );
      }, 100);
    }
  }

  public toggleFilterWithScroll(filter: WarehouseFilter) {
    // 필터를 선택하고 해당 카테고리로 스크롤
    if (!filter.isSelected()) {
      this.filterManager.deselectAll();
      this.selectFilter(filter);
    }

    // 필터 버튼을 화면에 보이도록 스크롤
    this.scrollToFilter(filter);

    // 해당 카테고리로 스크롤
    this.scrollToCategory(filter.getFilter());
  }

  // 이름·기간 행 탭 → 배낭 정보 수정 formSheet(BD-1). 현재값·저장 콜백을
  // 모듈 핸드오프에 넣고 공용 formSheet 라우트로 위임한다.
  public openInfoEdit() {
    if (!this.guardOnline()) {
      return;
    }

    app.getAnalyticsManager()?.logClick('bag_info_edit');

    setBagInfoEditContext({
      name: this.getName(),
      startDate: this.getStartDate(),
      endDate: this.getEndDate(),
      onSave: async (name, startDate, endDate) => {
        if (name !== this.getName()) {
          await this.updateName(name);
        }

        const datesChanged =
          !startDate.isSame(this.getStartDate(), 'day') ||
          !endDate.isSame(this.getEndDate(), 'day');

        if (datesChanged) {
          await this.updateDates(
            startDate.toISOString(),
            endDate.toISOString()
          );
        }

        // 이 배낭을 연결한 그룹의 공개 스냅샷을 다시 쓴다 (GRP-5 갱신 시점 ② 배낭 정보 수정).
        app.getGroupStore()?.syncBagSnapshotsInBackground(this.id);
      },
    });

    this.router.push('/bag-info-edit');
  }

  public async updateName(name: string) {
    await this.bagStore.updateName(this.id, name);
    this.setName(name);
  }

  public async updateDates(startDate: string, endDate: string) {
    await this.bagStore.updateDates(this.id, startDate, endDate);
    this.setStartDate(startDate);
    this.setEndDate(endDate);

    // 날씨 카드가 옛 기간 스냅샷을 계속 쓰지 않게 기간을 넘기고(필요 시 재조회) 갱신한다.
    await this.bagWeather.updateTripDates(dayjs(startDate), dayjs(endDate));
  }

  public async handleRefresh() {
    await this.initialize();
  }

  public goToEdit() {
    if (!this.guardOnline()) {
      return;
    }

    this.router.push(`/bag/${this.getId()}/edit`);
  }

  public goToEditGear(gear: Gear) {
    if (!this.guardOnline()) {
      return;
    }

    this.router.push(`/gear-edit/${gear.getId()}`);
  }

  public goToUseless() {
    if (!this.guardOnline()) {
      return;
    }

    this.router.push(`/useless/${this.getId()}`);
  }

  public handleScroll(event: any) {
    if (this.isScrollingSyncFilter) {
      return;
    } else {
      const currentOffset = event.nativeEvent.contentOffset.y;
      // iOS는 투명 헤더 높이만큼 가시 상단이 내려가 있어 인셋을 더해 보정한다(LG).
      const stickyHeaderHeight = this.topContentInset + 46;

      this.syncFilterByScrollPosition(currentOffset, stickyHeaderHeight);
    }
  }

  private syncFilterByScrollPosition(
    scrollY: number,
    stickyHeaderHeight: number
  ) {
    const categories = this.getGearsByCategory();
    const visibleTop = scrollY + stickyHeaderHeight;
    let firstVisibleCategory: GearFilter | null = null;
    let processedCount = 0;
    const totalCategories = categories.length;

    // 각 카테고리의 위치를 확인하여 완전히 보이는 첫 번째 카테고리 찾기
    for (const { category } of categories) {
      const element = this.categoryRefs.get(category.getFilter());
      if (element) {
        element.measureLayout(
          this.scrollViewRef,
          (_x: number, y: number, _width: number, _height: number) => {
            processedCount++;

            // 카테고리가 헤더에 전혀 가려지지 않는 경우
            if (y >= visibleTop && !firstVisibleCategory) {
              firstVisibleCategory = category.getFilter();
            }

            // 모든 카테고리 처리 완료 후 필터 설정
            if (processedCount === totalCategories && firstVisibleCategory) {
              this.setActiveFilterByScrollPosition(firstVisibleCategory);
            }
          },
          () => {
            processedCount++;
            // measureLayout 실패시에도 카운트 증가
          }
        );
      } else {
        processedCount++;
      }
    }
  }

  private setActiveFilterByScrollPosition = (categoryFilter: GearFilter) => {
    // 현재 선택된 필터가 이미 맞다면 변경하지 않음
    const currentSelected = this.filterManager
      .mapFilters(f => (f.isSelected() ? f.getFilter() : null))
      .find(f => f !== null);

    if (currentSelected === categoryFilter) return;

    // 모든 필터 해제 후 해당 카테고리 필터만 선택
    this.filterManager.deselectAll();
    let selectedFilter: WarehouseFilter | null = null;
    this.filterManager.mapFilters(filter => {
      if (filter.isSame(categoryFilter)) {
        filter.select();
        selectedFilter = filter;
      }
    });

    // 선택된 필터가 화면에 보이도록 스크롤
    if (selectedFilter) {
      this.scrollToFilter(selectedFilter);
    }
  };
}

export default BagDetail;
