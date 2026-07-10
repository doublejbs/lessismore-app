import Gear from '@/model/gear/Gear';

interface SearchDispatcherType {
  remove(gear: Gear): Promise<void>;
  register(gears: Gear[]): Promise<void>;
  searchList(
    keyword: string,
    index: number,
    filters?: { category?: string; brands?: string[] }
  ): Promise<{ gears: Gear[]; hasMore: boolean }>;
  getTopSearches(): Promise<string[]>;
}

export default SearchDispatcherType;
