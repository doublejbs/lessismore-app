import Gear from '@/model/gear/Gear';

interface SearchDispatcherType {
  remove(gear: Gear): Promise<void>;
  register(gears: Gear[]): Promise<void>;
  searchList(
    keyword: string,
    index: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }>;
  exploreList(
    category: string,
    sort: string,
    lastVisible?: any
  ): Promise<{ gears: Gear[]; hasMore: boolean; lastVisible?: any }>;
  getTopSearches(): Promise<string[]>;
}

export default SearchDispatcherType;
