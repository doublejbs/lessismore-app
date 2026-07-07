import Gear from '@/model/gear/Gear';
import BrowseSort from '@/model/search/BrowseSort';

// 피드 버킷 하나의 소싱 정의와 페이지네이션 상태.
// 각 버킷은 browse 쿼리 1개(정렬 replica + facet)에 대응하며 페이지를 독립 진행한다(FD-1, FD-4).
export enum FeedBucketKind {
  InterestCategory = 'interestCategory',
  InterestBrand = 'interestBrand',
  Popular = 'popular',
  NewArrival = 'newArrival',
}

interface FeedBucketParams {
  kind: FeedBucketKind;
  weight: number;
  sort: BrowseSort;
  category?: string;
  brands?: string[];
}

class FeedBucket {
  private page = 0;
  private hasMore = true;
  // 인터리브 시 아직 소비되지 않은(제외 규칙 통과) 후보 큐.
  private queue: Gear[] = [];

  public readonly kind: FeedBucketKind;
  public readonly weight: number;
  public readonly sort: BrowseSort;
  public readonly category: string | undefined;
  // 복수 브랜드 OR 그룹(필터 브랜드 다중 선택). 미지정 버킷은 undefined.
  public readonly brands: string[] | undefined;

  public constructor(params: FeedBucketParams) {
    this.kind = params.kind;
    this.weight = params.weight;
    this.sort = params.sort;
    this.category = params.category;
    this.brands = params.brands;
  }

  public buildBrowseParams(): {
    category?: string;
    brands?: string[];
    sort: BrowseSort;
    page: number;
  } {
    const params: {
      category?: string;
      brands?: string[];
      sort: BrowseSort;
      page: number;
    } = {
      sort: this.sort,
      page: this.page,
    };

    if (this.category) {
      params.category = this.category;
    }

    if (this.brands && this.brands.length > 0) {
      params.brands = this.brands;
    }

    return params;
  }

  public getPage() {
    return this.page;
  }

  public advancePage() {
    this.page += 1;
  }

  public canFetchMore() {
    return this.hasMore;
  }

  public setHasMore(value: boolean) {
    this.hasMore = value;
  }

  public enqueue(gears: Gear[]) {
    this.queue.push(...gears);
  }

  public hasQueued() {
    return this.queue.length > 0;
  }

  // 큐 앞에서 최대 count개를 꺼낸다.
  public dequeue(count: number): Gear[] {
    return this.queue.splice(0, count);
  }

  // 페이지·hasMore·큐를 초기 상태로 되돌린다(새로고침·필터 변경).
  public reset() {
    this.page = 0;
    this.hasMore = true;
    this.queue = [];
  }

  // 큐만 비우고 페이지 진행은 유지한다.
  public clearQueue() {
    this.queue = [];
  }
}

export default FeedBucket;
