import { makeAutoObservable } from 'mobx';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import WarehouseFilter from '../warehouse/WarehouseFilter';

class FilterManager {
  public static from() {
    return new FilterManager();
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.All,
      name: '전체', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Backpack,
      name: '배낭', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Tent,
      name: '텐트', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.SleepingBag,
      name: '침낭', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Mat,
      name: '매트', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Lantern,
      name: '랜턴', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Cooking,
      name: '조리', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Clothing,
      name: '의류', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Furniture,
      name: '가구', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Electronic,
      name: '전자기기', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Food,
      name: '음식', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
    {
      filter: GearFilter.Etc,
      name: '기타', // l10n-ignore: Firestore 카테고리 캐노니컬 값
    },
  ].map(({ filter, name }) => WarehouseFilter.from(filter, name));

  private constructor() {
    makeAutoObservable(this);
    this.selectAllFilter();
  }

  public initializeWithSelectedGears(selectedGears: Gear[]) {
    this.clearFilterCounts();
    selectedGears.forEach(gear => {
      // 세분 카테고리는 그룹(GearFilter) 기준으로 카운트한다(DM-4).
      this.filters
        .find(
          currentFilter => currentFilter.getFilter() === gear.getGroupCategory()
        )
        ?.plusCount();
    });
  }

  private clearFilterCounts() {
    this.filters.forEach(filter => {
      filter.resetCount();
    });
  }

  public addFilterCount(filter: GearFilter) {
    this.filters
      .find(currentFilter => currentFilter.getFilter() === filter)
      ?.plusCount();
  }

  public minusFilterCount(filter: GearFilter) {
    this.filters
      .find(currentFilter => currentFilter.getFilter() === filter)
      ?.minusCount();
  }

  public getFilters() {
    return this.filters;
  }

  private selectAllFilter() {
    this.filters.forEach(currentFilter => {
      if (currentFilter.getFilter() === GearFilter.All) {
        currentFilter.select();
      } else {
        currentFilter.deselect();
      }
    });
  }

  public getSelectedFilter() {
    return this.filters.find(filter => filter.isSelected()) ?? this.filters[0];
  }

  public isAllFilterSelected() {
    return this.filters[0].isSelected();
  }

  public selectFilter(filter: WarehouseFilter) {
    this.deselectAll();
    filter.select();
  }

  public deselectFilter(filter: WarehouseFilter) {
    filter.deselect();

    if (!this.getSelectedFilter()) {
      this.selectAllFilter();
    }
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  private deselectAll() {
    this.filters.forEach(currentFilter => {
      if (currentFilter.isSelected()) {
        currentFilter.deselect();
      }
    });
  }

  public getAllFilter() {
    return this.filters[0].getFilter();
  }
}

export default FilterManager;
