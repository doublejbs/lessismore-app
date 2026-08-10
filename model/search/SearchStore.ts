import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from '@firebase/firestore';
import { SearchResponse } from 'algoliasearch';
import { Hit, liteClient } from 'algoliasearch/lite';
import Gear, { toGearExtra, toOwnerGearExtra } from '../gear/Gear';
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

const BROWSE_HITS_PER_PAGE = 100;

// 인덱스(`useless-gear-search`)의 `paginationLimitedTo`와 같은 값이다.
// 이 상한보다 뒤 페이지를 요청하면 에러가 아니라 빈 결과(`hits: []`·`nbHits: 0`·`nbPages: 0`)가
// 돌아오고, 상한 안에서는 `nbPages`가 상한으로 클램프돼 응답만 봐서는 실제 총량을 알 수 없다.
// 그래서 페이지 상한은 응답이 아니라 이 상수로 계산한다(FD-3).
const ALGOLIA_PAGINATION_LIMIT = 1000;

// 한 필터 조합에서 실제로 넘길 수 있는 최대 페이지 수.
const MAX_BROWSE_PAGES = Math.floor(
  ALGOLIA_PAGINATION_LIMIT / BROWSE_HITS_PER_PAGE
);

// `가벼운순` 2단 조회용 numericFilter — 0g(무게 미입력)을 실제 무게와 분리한다(FD-3).
const WEIGHT_ASC_MEASURED_FILTER = 'weight>0';
const WEIGHT_ASC_UNMEASURED_FILTER = 'weight=0';

class SearchStore {
  private readonly searchClient = liteClient(
    'BWS6CWRXRM',
    'dafcc0c015856d4ca5fb6d0626cf8f9f'
  );

  // FD-3 `가벼운순` 1단(실제 무게)의 페이지 수 = 2단(0g)이 시작되는 경계.
  // 경계는 요청 page와 무관하고 필터 조합(카테고리 + 브랜드)만으로 정해지므로 조합별로 한 번만 계산해
  // 재사용한다. 키를 필터 조합으로 잡는 이유도 그것 — 필터가 달라지면 1단 총건수가 달라진다.
  // 페이지마다 다시 계산하면 `weight>0`의 nbHits가 비exhaustive 추정치라 값이 흔들려 경계가 밀리고,
  // Browse.appendResult가 중복 제거를 하지 않으므로 같은 장비가 두 번 붙어 React key까지 중복된다.
  private readonly weightAscMeasuredPages = new Map<string, number>();

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

  // `totalCount`는 응답의 `nbHits` — 지금까지 받은 건수가 아니라 **이 검색의 총 히트 수**다.
  // 검색 결과 화면이 첫 페이지만 받은 시점에도 총 개수를 붙일 수 있어야 하므로 함께 돌려준다
  // (SR-2). Algolia가 큰 결과 집합에서 근사값을 줄 수 있으나(`exhaustiveNbHits: false`)
  // 화면에 붙는 개수는 근사라도 페이지 누적에 따라 커지는 값보다 정확하다.
  public async searchList(
    value: string,
    index: number,
    filters?: { category?: string; brands?: string[] }
  ): Promise<{ gears: Gear[]; hasMore: boolean; totalCount: number }> {
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
    const { hits, page, nbPages, nbHits } =
      results[0] as SearchResponse<GearType>;

    return {
      gears: await this.convertWithMyGears(this.mapHitsToGearType(hits)),
      hasMore: (page ?? 0) + 1 < (nbPages ?? 0),
      totalCount: nbHits ?? 0,
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

    if (sort === BrowseSort.WeightAsc) {
      return this.browseWeightAsc(
        facetFilters,
        this.buildFilterKey(category, brands),
        page
      );
    }

    const { results } = await this.searchClient.search<GearType>({
      requests: [
        {
          indexName: getBrowseSortIndexName(sort),
          query: '',
          page,
          hitsPerPage: BROWSE_HITS_PER_PAGE,
          facetFilters,
        },
      ],
    });
    const {
      hits,
      page: resultPage,
      nbPages,
    } = results[0] as SearchResponse<GearType>;

    return {
      gears: await this.convertWithMyGears(this.mapHitsToGearType(hits)),
      hasMore: (resultPage ?? 0) + 1 < (nbPages ?? 0),
    };
  }

  // 경계 캐시 키 — buildFacetFilters와 같은 입력(카테고리 + 브랜드)으로 만든다.
  // 브랜드는 선택 순서가 결과에 영향을 주지 않으므로 정렬해 같은 조합이 같은 키가 되게 한다.
  private buildFilterKey(category?: string, brands?: string[]): string {
    const brandKey = brands ? [...brands].sort().join(',') : '';

    return `${category ?? ''}|${brandKey}`;
  }

  // `가벼운순` 조회 요청 하나 — 단계(numericFilter)와 페이지·페이지 크기만 갈아 끼운다.
  // 건수만 필요할 때는 hitsPerPage 0으로 부른다.
  private buildWeightAscRequest(
    facetFilters: string[][],
    numericFilter: string,
    page: number,
    hitsPerPage: number
  ) {
    return {
      indexName: getBrowseSortIndexName(BrowseSort.WeightAsc),
      query: '',
      page,
      hitsPerPage,
      facetFilters,
      numericFilters: [numericFilter],
    };
  }

  // 1단 총건수 → 경계 페이지 수로 환산해 캐시한다.
  // 경계 = min(ceil(1단 총건수 / 페이지 크기), 페이지 상한).
  private cacheMeasuredPages(filterKey: string, measuredHits: number): number {
    const measuredPages = Math.min(
      Math.ceil(measuredHits / BROWSE_HITS_PER_PAGE),
      MAX_BROWSE_PAGES
    );

    this.weightAscMeasuredPages.set(filterKey, measuredPages);

    return measuredPages;
  }

  // `가벼운순`만 2단 페이지네이션으로 조회한다(FD-3).
  // 카탈로그의 `weight: 0`은 "가장 가벼움"이 아니라 무게 미입력이고 그 비중이 커서, replica를 그대로
  // 넘기면 페이지 상한 안이 전부 0g으로 채워져 정렬이 사실상 죽는다(실측 수치는 specs/Feed.md §8).
  // 그래서 1단은 `weight>0`으로 실제 무게 오름차순을 **페이지 상한까지** 넘기고, 상한에 닿으면 2단으로
  // `weight=0`을 이어 붙인다. 즉 0g은 목록 맨 뒤가 아니라 가장 가벼운 1,000건 뒤에 온다.
  // 0g끼리의 순서는 의미가 없어 별도 정렬을 두지 않으며, `weight` 속성이 아예 없는 레코드는 두 단계
  // 모두에 걸리지 않는다(실측상 극소수).
  // 호출자는 단계를 몰라도 되며 `page`는 두 단계를 관통하는 연속 인덱스다.
  private async browseWeightAsc(
    facetFilters: string[][],
    filterKey: string,
    page: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const cachedPages = this.weightAscMeasuredPages.get(filterKey);

    if (cachedPages !== undefined) {
      if (page < cachedPages) {
        return this.browseMeasuredPage(facetFilters, page, cachedPages);
      }

      return this.browseUnmeasuredPage(facetFilters, page - cachedPages);
    }

    // 경계 미측정 상태. 페이지 상한 이상의 page는 경계가 얼마든 2단이 확실하므로(경계 ≤ 상한)
    // 어차피 빈 결과가 올 1단 히트 요청은 보내지 않고 건수만 세어 경계를 확정한다.
    if (page >= MAX_BROWSE_PAGES) {
      const measuredPages = await this.measureWeightAscPages(
        facetFilters,
        filterKey
      );

      return this.browseUnmeasuredPage(facetFilters, page - measuredPages);
    }

    return this.browseFirstMeasuredPage(facetFilters, filterKey, page);
  }

  // 1단 총건수만 세어 경계를 확정한다(page와 무관한 건수 요청 — HTTP 1회).
  private async measureWeightAscPages(
    facetFilters: string[][],
    filterKey: string
  ): Promise<number> {
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        this.buildWeightAscRequest(
          facetFilters,
          WEIGHT_ASC_MEASURED_FILTER,
          0,
          0
        ),
      ],
    });
    const { nbHits } = results[0] as SearchResponse<GearType>;

    return this.cacheMeasuredPages(filterKey, nbHits ?? 0);
  }

  // 이 필터 조합의 첫 요청 — 1단 히트와 경계 계산용 건수(1단·2단)를 한 번의 HTTP 호출에 함께 싣는다.
  // 경계는 반드시 **page와 무관한 건수 요청**에서 구한다. 페이지 응답의 nbPages/nbHits는 상한을 넘는
  // page에서 0으로 돌아오므로 그걸로 경계를 잡으면 2단 오프셋이 밀려 목록이 빈 채로 끊긴다.
  private async browseFirstMeasuredPage(
    facetFilters: string[][],
    filterKey: string,
    page: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const { results } = await this.searchClient.search<GearType>({
      requests: [
        this.buildWeightAscRequest(
          facetFilters,
          WEIGHT_ASC_MEASURED_FILTER,
          page,
          BROWSE_HITS_PER_PAGE
        ),
        this.buildWeightAscRequest(
          facetFilters,
          WEIGHT_ASC_MEASURED_FILTER,
          0,
          0
        ),
        this.buildWeightAscRequest(
          facetFilters,
          WEIGHT_ASC_UNMEASURED_FILTER,
          0,
          0
        ),
      ],
    });
    const measured = results[0] as SearchResponse<GearType>;
    const measuredCount = results[1] as SearchResponse<GearType>;
    const unmeasuredCount = results[2] as SearchResponse<GearType>;
    const measuredPages = this.cacheMeasuredPages(
      filterKey,
      measuredCount.nbHits ?? 0
    );

    // 이 조합의 1단이 요청 page보다 짧았다 — 함께 받아 온 히트는 버리고 2단으로 넘긴다.
    if (page >= measuredPages) {
      return this.browseUnmeasuredPage(facetFilters, page - measuredPages);
    }

    return {
      gears: await this.convertWithMyGears(
        this.mapHitsToGearType(measured.hits)
      ),
      // 1단에 남은 페이지가 있거나 이어 붙일 0g이 하나라도 있으면 더 불러올 수 있다.
      hasMore: page + 1 < measuredPages || (unmeasuredCount.nbHits ?? 0) > 0,
    };
  }

  // 경계가 확정된 뒤의 1단 페이지 — 히트만 받아 HTTP 1회로 끝낸다.
  // 2단 잔량(0g 건수)은 **1단 마지막 페이지에서만** 같은 호출에 실어 묻는다. 1단에 남은 페이지가
  // 있으면 0g이 몇 건이든 hasMore는 true라 답을 바꾸지 못하기 때문이다.
  private async browseMeasuredPage(
    facetFilters: string[][],
    page: number,
    measuredPages: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    const isLastMeasuredPage = page + 1 >= measuredPages;
    const requests = [
      this.buildWeightAscRequest(
        facetFilters,
        WEIGHT_ASC_MEASURED_FILTER,
        page,
        BROWSE_HITS_PER_PAGE
      ),
    ];

    if (isLastMeasuredPage) {
      requests.push(
        this.buildWeightAscRequest(
          facetFilters,
          WEIGHT_ASC_UNMEASURED_FILTER,
          0,
          0
        )
      );
    }

    const { results } = await this.searchClient.search<GearType>({ requests });
    const measured = results[0] as SearchResponse<GearType>;
    const gears = await this.convertWithMyGears(
      this.mapHitsToGearType(measured.hits)
    );

    if (!isLastMeasuredPage) {
      return { gears, hasMore: true };
    }

    const unmeasuredCount = results[1] as SearchResponse<GearType>;

    return { gears, hasMore: (unmeasuredCount.nbHits ?? 0) > 0 };
  }

  // 2단(0g) 페이지. `page`는 1단 경계를 뺀 2단 내부 인덱스다.
  // 2단도 같은 페이지 상한을 받으므로 상한 밖이면 요청하지 않고 소진으로 본다(빈 응답과 결과가 같다).
  private async browseUnmeasuredPage(
    facetFilters: string[][],
    unmeasuredPage: number
  ): Promise<{ gears: Gear[]; hasMore: boolean }> {
    if (unmeasuredPage >= MAX_BROWSE_PAGES) {
      return { gears: [], hasMore: false };
    }

    const { results } = await this.searchClient.search<GearType>({
      requests: [
        this.buildWeightAscRequest(
          facetFilters,
          WEIGHT_ASC_UNMEASURED_FILTER,
          unmeasuredPage,
          BROWSE_HITS_PER_PAGE
        ),
      ],
    });
    const { hits, nbPages } = results[0] as SearchResponse<GearType>;
    // 2단 자체 페이지네이션을 따르되 상한으로 함께 클램프한다.
    const unmeasuredPages = Math.min(nbPages ?? 0, MAX_BROWSE_PAGES);

    return {
      gears: await this.convertWithMyGears(this.mapHitsToGearType(hits)),
      hasMore: unmeasuredPage + 1 < unmeasuredPages,
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
        useless: [],
        used: [],
        bags: [],
        createDate: Date.now(),
        color,
        companyKorean,
        nameKorean,
        category,
        // 신규 옵셔널 필드 — hit에 없으면 키를 생략한다(exactOptionalPropertyTypes).
        // 검색 hit은 카탈로그(`gear`) 색인이라 imageUrl은 크롤 이미지다 — 읽지 않는다(DataModel §1).
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
        category = '',
        useless,
        used,
        bags,
        createDate,
        color,
        companyKorean,
        nameKorean,
      } = item;
      const myGear = this.findMyGear(id, myGears);
      // 탐색 목록 행도 창고와 같은 행 문법(LiquidMetricRow)을 쓰므로, 보유 장비면 창고 문서에서 읽은 본인
      // 사진을 이어받아 같은 장비가 화면마다 달라 보이지 않게 한다(WH-1·SR-2, GD-13).
      // 보유 목록은 이미 위에서 읽었으니 Firestore 추가 조회는 없다. 미보유 카탈로그 장비는
      // 크롤 이미지를 쓰지 않으므로 그대로 사진 없음이다(DataModel §1).
      const imageUrl = myGear?.getImageUrl();

      return new Gear(
        id,
        name,
        company,
        weight,
        Boolean(myGear),
        false,
        category,
        useless,
        used,
        bags,
        createDate,
        color,
        companyKorean,
        nameKorean,
        {
          ...toGearExtra(item),
          ...(imageUrl ? { imageUrl } : {}),
        }
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
            // 이 목록 자체는 화면에 나가지 않지만(보유 여부 판정용), `convertWithMyGears`가
            // 검색 결과 행에 이어 붙일 본인 사진을 여기서 가져온다 — 그래서 owner용으로 읽는다.
            // 보는 사람이 곧 업로더 본인이고, 크롤 URL은 Storage 경로 판별에서 걸러진다(§1, GD-13).
            toOwnerGearExtra(data, this.getUserId())
          );
        });
      } else {
        return [];
      }
    }
  }

  // 보유 여부와 이어받을 사진을 한 번에 얻으려고 boolean 대신 장비 자체를 돌려준다.
  private findMyGear(id: string, myGears: Gear[]) {
    return myGears.find(myGear => {
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
