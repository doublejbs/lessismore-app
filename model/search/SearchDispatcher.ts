import Gear from '@/model/gear/Gear';
import GearStore from '@/model/store/GearStore';
import SearchStore from '@/model/search/SearchStore';
import app from '@/model/app/App';
import SearchDispatcherType from '@/model/search/SearchDispatcherType';

class SearchDispatcher implements SearchDispatcherType {
  public static new() {
    return new SearchDispatcher(app.getGearStore()!, app.getSearchStore()!);
  }

  private constructor(
    private readonly gearStore: GearStore,
    private readonly searchStore: SearchStore
  ) {}

  public async register(gears: Gear[]): Promise<void> {
    await this.gearStore.register(gears);
  }

  public async remove(gear: Gear): Promise<void> {
    await this.gearStore.remove(gear);
  }

  public async searchList(
    keyword: string,
    index: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    return await this.searchStore.searchList(keyword, index);
  }
}

export default SearchDispatcher;
