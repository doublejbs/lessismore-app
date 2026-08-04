import dayjs from 'dayjs';
import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import { josa } from 'josa';
import BagStore from '@/model/store/BagStore';
import Firebase from '@/model/firebase/Firebase';
import GearStore from '@/model/store/GearStore';
import Gear from '@/model/gear/Gear';
import Order from '@/model/order/Order';
import GearFilter from '@/model/gear/GearFilter';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagDetailFilterManager from '@/model/bag-detail/BagDetailFilterManager';
import PackingButtonState from '@/model/bag-detail/PackingButtonState';
import { ImperativeRouter } from 'expo-router';
import BagWeather from '@/model/bag/BagWeather';
import { BagActivitySummary } from '@/model/bag/BagActivitySummary';
import { setBagInfoEditContext } from '@/model/bag-detail/BagInfoEditHandoff';
import { getBagShareUrl } from '@/constants/WebLinks';

class BagDetail {
  public static readonly ORDER_KEY = 'bag';

  public static from(router: ImperativeRouter, id: string) {
    return new BagDetail(
      router,
      id,
      app.getBagStore()!,
      app.getGearStore()!,
      BagDetailFilterManager.from(),
      Order.new(BagDetail.ORDER_KEY),
      app.getFirebase()
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

  private constructor(
    private readonly router: ImperativeRouter,
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly filterManager: BagDetailFilterManager,
    private readonly order: Order,
    private readonly firebase: Firebase
  ) {
    this.bagWeather = BagWeather.of(id, bagStore);
    makeAutoObservable(this);
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

  public async initialize() {
    this.order.initialize();
    await this.getData();
    this.filterManager.selectFirstFilter();
    this.setInitialized(true);
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
  }

  private async loadPackingState() {
    const { packedGears, packingStartedAt, packingCompletedAt } =
      await this.bagStore.getPackingState(this.id);

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

  // 날짜 부제에 붙일 상황 라벨(D-day / 여행 중 / 지난 여행).
  public getPhaseLabel(): string {
    const today = dayjs().startOf('day');
    const phase = this.getTripPhase();
    if (phase === 'before') {
      const d = this.startDate.startOf('day').diff(today, 'day');
      return d === 0 ? '오늘 출발' : `D-${d}`;
    }
    if (phase === 'ongoing') {
      return '여행 중';
    }
    return '지난 여행';
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
   * 창고의 장비 자체는 지우지 않으므로 문구도 `삭제`가 아니라 `빼기`로 쓴다.
   */
  public async delete(gear: Gear) {
    const name = gear.getDisplayName();

    app.getAlertManager()?.show({
      message: josa(`${name}#{을} 이 배낭에서 뺄까요?`),
      confirmText: '빼기',
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
      return this.startDate.format('YYYY.MM.DD');
    } else {
      return `${this.startDate.format('YYYY.MM.DD')} ~ ${this.endDate.format(
        'YYYY.MM.DD'
      )}`;
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
      } catch (error) {
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
    const element = this.filterButtonRefs.get(filter.getName());

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
    this.router.push(`/bag/${this.getId()}/edit`);
  }

  public goToEditGear(gear: Gear) {
    this.router.push(`/gear-edit/${gear.getId()}`);
  }

  public goToUseless() {
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
