import { makeAutoObservable } from 'mobx';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import WarehouseFilter from '../warehouse/WarehouseFilter';
import { GEAR_FILTER_NAMES } from '../gear/GearFilterName';

class FilterManager {
  public static from() {
    return new FilterManager();
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.All,
      name: GEAR_FILTER_NAMES[GearFilter.All],
    },
    {
      filter: GearFilter.Backpack,
      name: GEAR_FILTER_NAMES[GearFilter.Backpack],
    },
    {
      filter: GearFilter.Tent,
      name: GEAR_FILTER_NAMES[GearFilter.Tent],
    },
    {
      filter: GearFilter.SleepingBag,
      name: GEAR_FILTER_NAMES[GearFilter.SleepingBag],
    },
    {
      filter: GearFilter.Mat,
      name: GEAR_FILTER_NAMES[GearFilter.Mat],
    },
    {
      filter: GearFilter.Lantern,
      name: GEAR_FILTER_NAMES[GearFilter.Lantern],
    },
    {
      filter: GearFilter.Cooking,
      name: GEAR_FILTER_NAMES[GearFilter.Cooking],
    },
    {
      filter: GearFilter.Clothing,
      name: GEAR_FILTER_NAMES[GearFilter.Clothing],
    },
    {
      filter: GearFilter.Furniture,
      name: GEAR_FILTER_NAMES[GearFilter.Furniture],
    },
    {
      filter: GearFilter.Electronic,
      name: GEAR_FILTER_NAMES[GearFilter.Electronic],
    },
    {
      filter: GearFilter.Food,
      name: GEAR_FILTER_NAMES[GearFilter.Food],
    },
    {
      filter: GearFilter.Etc,
      name: GEAR_FILTER_NAMES[GearFilter.Etc],
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
