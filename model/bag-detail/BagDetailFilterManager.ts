import { makeAutoObservable } from 'mobx';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import app from '@/model/app/App';

class BagDetailFilterManager {
  public static from() {
    return new BagDetailFilterManager();
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.Backpack,
      name: 'backpack',
    },
    {
      filter: GearFilter.Tent,
      name: 'tent',
    },
    {
      filter: GearFilter.SleepingBag,
      name: 'sleepingBag',
    },
    {
      filter: GearFilter.Mat,
      name: 'mat',
    },
    {
      filter: GearFilter.Lantern,
      name: 'lantern',
    },
    {
      filter: GearFilter.Cooking,
      name: 'cooking',
    },
    {
      filter: GearFilter.Clothing,
      name: 'clothing',
    },
    {
      filter: GearFilter.Furniture,
      name: 'furniture',
    },
    {
      filter: GearFilter.Electronic,
      name: 'electronic',
    },
    {
      filter: GearFilter.Food,
      name: 'food',
    },
    {
      filter: GearFilter.Etc,
      name: 'etc',
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
    return app.getL10n().t(
      filter ? `bagDetail.summary.${filter.getName()}` : 'bagDetail.summary.etc'
    );
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
