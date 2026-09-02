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

    this.initialized = true;
    this.isLoading = true;
    await this.loadFirstPage();
  }

  public async setFilter(filter: CommunityFeedFilter) {
    this.filter = filter;
    app.getAnalyticsManager()?.logClick('community_filter', { type: filter });
    this.isLoading = true;
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

    this.isLoadingMore = true;
    const requestVersion = this.requestVersion;

    try {
      const page = await this.dispatcher.getPage(this.filter, this.cursor);

      if (requestVersion !== this.requestVersion) {
        return;
      }

      this.posts = [...this.posts, ...page.posts];
      this.cursor = page.cursor;
      this.hasMore = page.hasMore;
      this.error = null;
    } catch (error) {
      if (requestVersion === this.requestVersion) {
        this.error = error instanceof Error ? error : new Error(String(error));
      }
    } finally {
      this.isLoadingMore = false;
    }
  }

  public async refresh() {
    if (this.isLoading || this.isLoadingMore || this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    await this.loadFirstPage();
    this.isRefreshing = false;
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
    const requestVersion = ++this.requestVersion;
    this.cursor = null;

    try {
      const page = await this.dispatcher.getPage(this.filter, null);

      if (requestVersion !== this.requestVersion) {
        return;
      }

      this.posts = page.posts;
      this.cursor = page.cursor;
      this.hasMore = page.hasMore;
      this.error = null;
    } catch (error) {
      if (requestVersion === this.requestVersion) {
        this.error = error instanceof Error ? error : new Error(String(error));
      }
    } finally {
      if (requestVersion === this.requestVersion) {
        this.isLoading = false;
      }
    }
  }
}

export default CommunityFeed;
