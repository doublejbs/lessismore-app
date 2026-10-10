import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import CommunityFeedSort from '@/model/community/CommunityFeedSort';
import CommunityPost from '@/model/community/CommunityPost';
import { subscribeCommunityPostDeleted } from '@/model/community/CommunityFeedInvalidation';
import Order from '@/model/order/Order';
import OrderType from '@/model/order/OrderType';
import { createCommunityFeedOrderOptions } from '@/model/order/CommunityFeedOrderOptions';
import CommunityFeedDispatcher from './CommunityFeedDispatcher';

class CommunityFeed {
  private filter = CommunityFeedFilter.All;
  private sort = CommunityFeedSort.Latest;
  private posts: CommunityPost[] = [];
  private cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  private hasMore = false;
  private isLoading = false;
  private isLoadingMore = false;
  private isRefreshing = false;
  private error: Error | null = null;
  private initialized = false;
  private requestVersion = 0;
  private unsubscribeDeleted: (() => void) | null = null;
  private subscribedDeleted = false;
  private isQuietRefreshing = false;
  // 박지 필터(CS-11 `전체 보기` → `/community?spot={id}`). 걸려 있으면 그 박지의 여행 기록만 보인다.
  private spotId: string | null = null;
  private spotName = '';
  // 박지 필터를 걸기 직전의 첨부 필터·정렬 — 박지 칩을 해제하면 되돌린다.
  private beforeSpot: {
    filter: CommunityFeedFilter;
    sort: CommunityFeedSort;
  } | null = null;

  public static from(dispatcher: CommunityFeedDispatcher) {
    return new CommunityFeed(
      dispatcher,
      Order.new('communityFeed', createCommunityFeedOrderOptions())
    );
  }

  private constructor(
    private readonly dispatcher: CommunityFeedDispatcher,
    private readonly order: Order
  ) {
    makeAutoObservable(this);
  }

  public dispose() {
    this.unsubscribeDeleted?.();
    this.setUnsubscribeDeleted(null);
    this.setSubscribedDeleted(false);
  }

  public async initialize() {
    if (this.initialized) {
      return;
    }

    this.subscribeDeleted();
    await this.order.initialize();
    this.setSortValue(this.getSortFromOrder());
    this.setInitialized(true);
    this.setLoading(true);
    await this.loadFirstPage();
  }

  /**
   * 라우트 파라미터를 적용한다 — 홈 `더 보기`(HM-17)의 `filter`, 박지 상세 `전체 보기`(CS-11)의 `spot`.
   * 바뀐 것이 없으면 다시 읽지 않는다. 초기화 전이면 값만 넣어 첫 조회가 그 조건으로 나가게 한다.
   */
  public async applyRouteParams(
    filter: CommunityFeedFilter | null,
    spotId: string | null,
    spotName: string
  ) {
    // 파라미터가 비어 있으면(소비 후 지운 상태) 지금 조건을 유지한다.
    let nextFilter = this.filter;
    let nextSpotId = this.spotId;
    let nextSpotName = this.spotName;

    if (spotId) {
      nextFilter = CommunityFeedFilter.All;
      nextSpotId = spotId;
      nextSpotName = spotName;
    } else if (filter) {
      nextFilter = filter;
      nextSpotId = null;
      nextSpotName = '';
    }

    if (nextFilter === this.filter && nextSpotId === this.spotId) {
      return;
    }

    if (nextSpotId && !this.spotId) {
      this.beforeSpot = { filter: this.filter, sort: this.sort };
    } else if (!nextSpotId) {
      this.beforeSpot = null;
    }

    this.setFilterValue(nextFilter);
    this.setSpot(nextSpotId, nextSpotName);

    if (!this.initialized) {
      return;
    }

    this.setLoading(true);
    await this.loadFirstPage();
  }

  public getSpotId() {
    return this.spotId;
  }

  public getSpotName() {
    return this.spotName;
  }

  // 박지 칩 라벨을 뒤늦게 채운다 — 그사이 다른 박지로 바뀌었으면 무시한다.
  public setSpotName(spotId: string, name: string) {
    if (this.spotId !== spotId) {
      return;
    }

    this.spotName = name;
  }

  // 박지 칩의 해제(CS-11) — 전체 피드로 돌아간다.
  public async clearSpot() {
    if (!this.spotId) {
      return;
    }

    const previous = this.beforeSpot;

    this.beforeSpot = null;
    this.setSpot(null, '');

    if (previous) {
      this.setFilterValue(previous.filter);
      this.setSortValue(previous.sort);
    }

    this.setLoading(true);
    await this.loadFirstPage();
  }

  public async setFilter(filter: CommunityFeedFilter) {
    // 첨부 필터를 고르면 박지 필터는 풀린다 — 둘을 함께 거는 조회 인덱스가 없다(DM-28 인덱스 ②).
    this.beforeSpot = null;
    this.setSpot(null, '');
    this.setFilterValue(filter);
    app.getAnalyticsManager()?.logClick('community_filter', { filter });
    this.setLoading(true);
    await this.loadFirstPage();
  }

  public async setSort(sort: CommunityFeedSort) {
    if (this.sort === sort) {
      return;
    }

    const option = this.order
      .mapOrderOptions(item => item)
      .find(item => this.getSortFromOrderType(item.getOrder()) === sort);

    if (!option) {
      return;
    }

    this.order.setOrderOption(option);
    this.setSortValue(sort);
    app.getAnalyticsManager()?.logClick('community_sort', { sort });
    this.setLoading(true);
    await this.loadFirstPage();
  }

  public async loadMore() {
    if (
      this.isLoading ||
      this.isLoadingMore ||
      this.isRefreshing ||
      this.isQuietRefreshing ||
      !this.hasMore
    ) {
      return;
    }

    this.setLoadingMore(true);
    const requestVersion = this.requestVersion;

    try {
      const page = await this.dispatcher.getPage(
        this.filter,
        this.sort,
        this.cursor,
        this.spotId
      );

      if (requestVersion !== this.requestVersion) {
        return;
      }

      this.setPosts([...this.posts, ...page.posts]);
      this.setCursor(page.cursor);
      this.setHasMore(page.hasMore);
      this.setError(null);
    } catch (error) {
      if (requestVersion === this.requestVersion) {
        this.setError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } finally {
      this.setLoadingMore(false);
    }
  }

  public async refresh(quiet = false) {
    if (
      this.isLoading ||
      this.isLoadingMore ||
      this.isRefreshing ||
      this.isQuietRefreshing
    ) {
      return;
    }

    if (!quiet) {
      this.setRefreshing(true);
    } else {
      this.setQuietRefreshing(true);
    }

    try {
      await this.loadFirstPage(quiet);
    } finally {
      if (quiet) {
        this.setQuietRefreshing(false);
      } else {
        this.setRefreshing(false);
      }
    }
  }

  public getFilter() {
    return this.filter;
  }

  public getSort() {
    return this.sort;
  }

  public getOrder() {
    return this.order;
  }

  public getIsInitialized() {
    return this.initialized;
  }

  public getPosts() {
    return this.posts;
  }

  public getHasMore() {
    return this.hasMore;
  }

  public getIsLoading() {
    return this.isLoading;
  }

  public getIsLoadingMore() {
    return this.isLoadingMore;
  }

  public getIsRefreshing() {
    return this.isRefreshing;
  }

  public getError() {
    return this.error;
  }

  private async loadFirstPage(quiet = false) {
    const requestVersion = this.requestVersion + 1;
    this.setRequestVersion(requestVersion);

    if (!quiet) {
      this.setCursor(null);
    }

    try {
      const page = await this.dispatcher.getPage(
        this.filter,
        this.sort,
        null,
        this.spotId
      );

      if (requestVersion !== this.requestVersion) {
        return;
      }

      this.setPosts(page.posts);
      this.setCursor(page.cursor);
      this.setHasMore(page.hasMore);
      this.setError(null);
    } catch (error) {
      if (requestVersion === this.requestVersion) {
        this.setError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } finally {
      if (requestVersion === this.requestVersion && !quiet) {
        this.setLoading(false);
      }
    }
  }

  private setSpot(spotId: string | null, spotName: string) {
    this.spotId = spotId;
    this.spotName = spotName;
  }

  private setFilterValue(value: CommunityFeedFilter) {
    this.filter = value;
  }

  private setSortValue(value: CommunityFeedSort) {
    this.sort = value;
  }

  private setPosts(value: CommunityPost[]) {
    this.posts = value;
  }

  private setCursor(value: QueryDocumentSnapshot<DocumentData> | null) {
    this.cursor = value;
  }

  private setHasMore(value: boolean) {
    this.hasMore = value;
  }

  private setLoading(value: boolean) {
    this.isLoading = value;
  }

  private setLoadingMore(value: boolean) {
    this.isLoadingMore = value;
  }

  private setRefreshing(value: boolean) {
    this.isRefreshing = value;
  }

  private setError(value: Error | null) {
    this.error = value;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  private setRequestVersion(value: number) {
    this.requestVersion = value;
  }

  private setUnsubscribeDeleted(value: (() => void) | null) {
    this.unsubscribeDeleted = value;
  }

  private setSubscribedDeleted(value: boolean) {
    this.subscribedDeleted = value;
  }

  private setQuietRefreshing(value: boolean) {
    this.isQuietRefreshing = value;
  }

  private subscribeDeleted() {
    if (this.subscribedDeleted) {
      return;
    }

    this.setUnsubscribeDeleted(
      subscribeCommunityPostDeleted(postId => {
        this.removePost(postId);
      })
    );
    this.setSubscribedDeleted(true);
  }

  private removePost(postId: string) {
    this.setPosts(this.posts.filter(post => post.getId() !== postId));
  }

  private getSortFromOrder() {
    const orderType = this.order.getSelectedOrderType();

    return this.getSortFromOrderType(orderType);
  }

  private getSortFromOrderType(orderType: OrderType | undefined) {
    return orderType === OrderType.Popular
      ? CommunityFeedSort.Popular
      : CommunityFeedSort.Latest;
  }
}

export default CommunityFeed;
