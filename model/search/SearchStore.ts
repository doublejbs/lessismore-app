import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from '@firebase/firestore';
import { SearchResponse } from 'algoliasearch';
import { Hit, liteClient } from 'algoliasearch/lite';
import Gear, { toGearExtra } from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import { GROUP_MEMBERS, getGroupMembers } from '../gear/GearCategoryGroups';
import Firebase from '../firebase/Firebase';
import GearType from '../gear/GearType';
import BrowseSort from './BrowseSort';

const BROWSE_INDEX_NAME = 'useless-gear-search';

const BROWSE_SORT_INDEX: Record<BrowseSort, string> = {
  [BrowseSort.Popular]: `${BROWSE_INDEX_NAME}_count_desc`,
  [BrowseSort.Latest]: `${BROWSE_INDEX_NAME}_createDate_desc`,
  [BrowseSort.WeightAsc]: `${BROWSE_INDEX_NAME}_weight_asc`,
  [BrowseSort.WeightDesc]: `${BROWSE_INDEX_NAME}_weight_desc`,
};

const getBrowseSortIndexName = (sort: BrowseSort): string => {
  return BROWSE_SORT_INDEX[sort];
};

class SearchStore {
  private readonly searchClient = liteClient(
    'BWS6CWRXRM',
    'dafcc0c015856d4ca5fb6d0626cf8f9f'
  );

  public constructor(private readonly firebase: Firebase) {}

  public async getTopSearches(): Promise<string[]> {
    try {
      const response = await fetch(
        'https://analytics.algolia.com/2/searches?index=useless-gear-search&limit=10&orderBy=searchCount&direction=desc',
        {
          headers: {
            'X-Algolia-Application-Id': 'BWS6CWRXRM',
            'X-Algolia-API-Key': 'dafcc0c015856d4ca5fb6d0626cf8f9f',
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch top searches:', response.status);
        return [];
      }

      const data = await response.json();
      return (
        data.searches?.map((item: { search: string }) => item.search) || []
      );
    } catch (error) {
      console.error('Error fetching top searches:', error);
      return [];
    }
  }

  // 카테고리 + 브랜드(OR 그룹) facetFilters — browse·searchList가 공유한다(FD-3/SR-1).
  private buildFacetFilters(category?: string, brands?: string[]): string[][] {
    const facetFilters: string[][] = [];

    if (category) {
      // 1차 그룹(GearFilter) 키면 그룹의 세분 멤버들을 하나의 OR 배열로 확장하고,
      // 세분 키면 기존대로 단일 facet으로 넘긴다(DM-4).
      const facetGroup = GROUP_MEMBERS[category as GearFilter]
        ? getGroupMembers(category as GearFilter).map(key => `category:${key}`)
        : [`category:${category}`];

      facetFilters.push(facetGroup);
    }

    if (brands && brands.length > 0) {
      // 복수 브랜드는 하나의 OR 그룹 — 모든 브랜드의 companyKorean·company facet을 같은 내부 배열에 나열한다.
      // companyKorean 없는 영문 브랜드도 매칭되며, 여러 브랜드는 서로 OR로 묶인다(FD-3).
      const brandFacets = brands.flatMap(brand => [
        `companyKorean:${brand}`,
        `company:${brand}`,
      ]);

      facetFilters.push(brandFacets);
    }

    return facetFilters;
  }

  public async searchList(
    value: string,
    index: number,
    filters?: { category?: string; brands?: string[] }
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const keyword = value.trim();
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: 'useless-gear-search',
          query: keyword,
          page: index,
          hitsPerPage: 100,
          facetFilters: this.buildFacetFilters(
            filters?.category,
            filters?.brands
          ),
        },
      ],
    });
    const { hits, page, nbPages } = results[0] as SearchResponse<GearType>;

    return {
      gears: await this.convertWithMyGears(this.mapHitsToGearType(hits)),
      hasMore: (page ?? 0) + 1 < (nbPages ?? 0),
    };
  }

  public async browse(params: {
    category?: string;
    brands?: string[];
    sort: BrowseSort;
    page: number;
  }): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const { category, brands, sort, page } = params;

    const facetFilters = this.buildFacetFilters(category, brands);

    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: getBrowseSortIndexName(sort),
          query: '',
          page,
          hitsPerPage: 100,
          facetFilters,
        },
      ],
    });
    const { hits, page: resultPage, nbPages } = results[0] as SearchResponse<GearType>;

    return {
      gears: await this.convertWithMyGears(this.mapHitsToGearType(hits)),
      hasMore: (resultPage ?? 0) + 1 < (nbPages ?? 0),
    };
  }

  public async getNewArrivals(count: number = 20): Promise<Gear[]> {
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: `${BROWSE_INDEX_NAME}_createDate_desc`,
          query: '',
          page: 0,
          hitsPerPage: count,
        },
      ],
    });
    const { hits } = results[0] as SearchResponse<GearType>;

    return this.convertWithMyGears(this.mapHitsToGearType(hits));
  }

  private mapHitsToGearType(hits: Hit<GearType>[]): GearType[] {
    return hits.map(hit => {
      const {
        name,
        weight,
        company,
        objectID,
        imageUrl,
        color,
        companyKorean,
        nameKorean,
        category = '',
      } = hit;

      return {
        name,
        weight,
        company,
        id: objectID,
        imageUrl,
        useless: [],
        used: [],
        bags: [],
        createDate: Date.now(),
        color,
        companyKorean,
        nameKorean,
        category,
        // 신규 옵셔널 필드 — hit에 없으면 키를 생략한다(exactOptionalPropertyTypes).
        ...toGearExtra(hit),
      };
    });
  }

  private async convertWithMyGears(data: GearType[]) {
    const myGears = await this.getList(GearFilter.All);

    return data.map(item => {
      const {
        name,
        weight,
        company,
        id,
        imageUrl,
        category = '',
        useless,
        used,
        bags,
        createDate,
        color,
        companyKorean,
        nameKorean,
      } = item;

      return new Gear(
        id,
        name,
        company,
        weight,
        imageUrl,
        this.hasGear(id, myGears),
        false,
        category,
        useless,
        used,
        bags,
        createDate,
        color,
        companyKorean,
        nameKorean,
        toGearExtra(item)
      );
    });
  }

  private async getList(filter: GearFilter): Promise<Gear[]> {
    if (!this.firebase.isLoggedIn()) {
      return [];
    } else {
      const filterQuery =
        filter === GearFilter.All
          ? collection(this.getStore(), 'users', this.getUserId(), 'gears')
          : query(
              collection(this.getStore(), 'users', this.getUserId(), 'gears'),
              // 1차 그룹은 세분 멤버 집합으로 확장한다(단일 그룹이라 ≤8키, Firestore in 30 제한 내, DM-4).
              where('category', 'in', getGroupMembers(filter)),
              orderBy('name', 'desc')
            );
      const gears = (await getDocs(filterQuery)).docs;

      if (gears?.length) {
        return gears.map(doc => {
          const data = doc.data();
          const {
            id,
            name,
            company,
            weight,
            imageUrl,
            isCustom,
            category,
            useless,
            used,
            bags,
            createDate,
            color,
            companyKorean,
            nameKorean,
          } = data;

          return new Gear(
            id,
            name,
            company,
            weight,
            imageUrl,
            true,
            isCustom,
            category,
            useless,
            used,
            bags,
            createDate,
            color,
            companyKorean,
            nameKorean,
            toGearExtra(data)
          );
        });
      } else {
        return [];
      }
    }
  }

  private hasGear(id: string, myGears: Gear[]) {
    return myGears.some(myGear => {
      return myGear.hasId(id);
    });
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserId() {
    return this.firebase.getUserId();
  }
}

export default SearchStore;
