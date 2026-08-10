import Gear from '@/model/gear/Gear';

interface SearchDispatcherType {
  remove(gear: Gear): Promise<void>;
  register(gears: Gear[]): Promise<void>;
  // totalCount는 이 검색의 총 히트 수(`nbHits`)다 — 지금까지 받은 누적 건수가 아니다(SR-2).
  searchList(
    keyword: string,
    index: number,
    filters?: { category?: string; brands?: string[] }
  ): Promise<{ gears: Gear[]; hasMore: boolean; totalCount: number }>;
  getTopSearches(): Promise<string[]>;
}

export default SearchDispatcherType;
