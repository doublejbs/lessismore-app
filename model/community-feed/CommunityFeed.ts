import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityFeedDispatcher from './CommunityFeedDispatcher';

class CommunityFeed {
  private filter = CommunityFeedFilter.All;
  private posts: CommunityPost[] = [];
  private cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  private hasMore = false;
  private isLoading = false;
  private isLoadingMore = false;
  private isRefreshing = false;
  private error: Error | null = null;
  private initialized = false;
  private requestVersion = 0;

  public static from(dispatcher: CommunityFeedDispatcher) {
    return new CommunityFeed(dispatcher);
  }

  private constructor(private readonly dispatcher: CommunityFeedDispatcher) {
    makeAutoObservable(this);
  }

  public async initialize() {
    if (this.initialized) {
      return;
    }

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

  public async loadMore() {
    if (
      this.isLoading ||
      this.isLoadingMore ||
      this.isRefreshing ||
      !this.hasMore
    ) {
      return;
    }

    this.setLoadingMore(true);
    const requestVersion = this.requestVersion;

    try {
      const page = await this.dispatcher.getPage(this.filter, this.cursor);

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

  public async refresh() {
    if (this.isLoading || this.isLoadingMore || this.isRefreshing) {
      return;
    }

    this.setRefreshing(true);
    await this.loadFirstPage();
    this.setRefreshing(false);
  }

  public getFilter() {
    return this.filter;
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

  private async loadFirstPage() {
    const requestVersion = this.requestVersion + 1;
    this.setRequestVersion(requestVersion);
    this.setCursor(null);

    try {
      const page = await this.dispatcher.getPage(this.filter, null);

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
      if (requestVersion === this.requestVersion) {
        this.setLoading(false);
      }
    }
  }

  private setFilterValue(value: CommunityFeedFilter) {
    this.filter = value;
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
}

export default CommunityFeed;
