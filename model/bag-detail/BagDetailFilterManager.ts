import { makeAutoObservable } from 'mobx';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import {
  GEAR_FILTER_NAMES,
  getGearFilterName,
} from '@/model/gear/GearFilterName';

class BagDetailFilterManager {
  public static from() {
    return new BagDetailFilterManager();
  }

  private readonly filters: WarehouseFilter[] = [
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
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      filter.deselect();
    } else {
      filter.select();
    }
  }

  public hasFilter(filter: GearFilter) {
    return this.filters.some(f => f.isSame(filter));
  }

  public selectFilter(filter: WarehouseFilter) {
    filter.select();
  }

  public deselectFilter(filter: WarehouseFilter) {
    filter.deselect();
  }

  public deselectAll() {
    this.filters.forEach(filter => filter.deselect());
  }

  public groupGearsByCategory(gears: Gear[]) {
    return this.filters
      .map(filter => ({
        category: filter,
        gears: gears.filter(
          gear => gear.getGroupCategory() === filter.getFilter()
        ),
      }))
      .filter(({ gears }) => gears.length > 0);
  }

  public getCategoryName(category: GearFilter): string {
    const filter = this.filters.find(f => f.isSame(category));

    return filter
      ? getGearFilterName(filter.getFilter())
      : getGearFilterName(GearFilter.Etc);
  }

  public getFiltersWithGears(gears: Gear[]) {
    return this.filters.filter(filter =>
      gears.some(gear => gear.getGroupCategory() === filter.getFilter())
    );
  }

  public selectFirstFilter() {
    if (this.hasSelectedFilter()) {
      return;
    } else {
      this.filters[0].select();
    }
  }

  private hasSelectedFilter() {
    return this.filters.some(filter => filter.isSelected());
  }
}

export default BagDetailFilterManager;
