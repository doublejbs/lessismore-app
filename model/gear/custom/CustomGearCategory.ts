import GearFilter from '@/model/gear/GearFilter';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';

class CustomGearCategory {
  public static new() {
    return new CustomGearCategory();
  }

  private readonly filters: WarehouseFilter[] = [
    {
      filter: GearFilter.Tent,
      name: GEAR_FILTER_NAMES[GearFilter.Tent],
    },
    {
      filter: GearFilter.SleepingBag,
      name: GEAR_FILTER_NAMES[GearFilter.SleepingBag],
    },
    {
      filter: GearFilter.Backpack,
      name: GEAR_FILTER_NAMES[GearFilter.Backpack],
    },
    {
      filter: GearFilter.Clothing,
      name: GEAR_FILTER_NAMES[GearFilter.Clothing],
    },
    {
      filter: GearFilter.Mat,
      name: GEAR_FILTER_NAMES[GearFilter.Mat],
    },
    {
      filter: GearFilter.Furniture,
      name: GEAR_FILTER_NAMES[GearFilter.Furniture],
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

  private constructor() {}

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filters.map(callback);
  }

  public selectFilter(filter: WarehouseFilter) {
    this.filters.forEach(currentFilter => {
      if (currentFilter === filter) {
        currentFilter.select();
      } else {
        currentFilter.deselect();
      }
    });
  }

  public getSelectedFilter() {
    return (
      this.filters.find(filter => filter.isSelected())?.getFilter() ??
      GearFilter.All
    );
  }

  public getSelectedFirstCategory() {
    const selectedFilter = this.getSelectedFilter();

    switch (selectedFilter) {
      case GearFilter.Tent:
      case GearFilter.SleepingBag:
      case GearFilter.Backpack:
      case GearFilter.Mat: {
        return 'big4';
      }
      default: {
        return selectedFilter;
      }
    }
  }

  public selectFirst() {
    this.selectFilter(this.filters[0]);
    return this;
  }

  public clear() {
    this.selectFirst();
  }

  public selectFilterWith(gearFilter: GearFilter) {
    this.selectFilter(
      this.filters.find(filter => filter.getFilter() === gearFilter) ??
        this.filters[0]
    );
  }
}

export default CustomGearCategory;
