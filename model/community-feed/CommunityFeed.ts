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

  public async setFilter(filter: CommunityFeedFilter) {
    this.setFilterValue(filter);
    app.getAnalyticsManager()?.logClick('click_community_filter', { type: filter });
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
    app.getAnalyticsManager()?.logClick('click_community_sort', { sort });
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
        this.cursor
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
      const page = await this.dispatcher.getPage(this.filter, this.sort, null);

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

    this.setUnsubscribeDeleted(subscribeCommunityPostDeleted((postId) => {
      this.removePost(postId);
    }));
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
