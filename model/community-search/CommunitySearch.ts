import { makeAutoObservable } from 'mobx';
import CommunityPost from '@/model/community/CommunityPost';
import app from '@/model/app/App';
import { BLOCKED_AUTO_PAGE_LIMIT } from '@/model/block/BlockLimits';
import CommunitySearchDispatcher from './CommunitySearchDispatcher';

class CommunitySearch {
  private query = '';
  private searchTerm = '';
  private posts: CommunityPost[] = [];
  private hasMore = false;
  private isLoading = false;
  private isLoadingMore = false;
  private error: Error | null = null;
  private hasSearched = false;
  private totalHits = 0;
  private nextPage = 0;
  private requestVersion = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  public static from(dispatcher: CommunitySearchDispatcher) {
    return new CommunitySearch(dispatcher);
  }

  private constructor(
    private readonly dispatcher: CommunitySearchDispatcher
  ) {
    makeAutoObservable(this);
  }

  public dispose() {
    this.clearDebounceTimer();
  }

  public setQuery(text: string) {
    this.clearDebounceTimer();
    this.setQueryValue(text);
    this.setSearchTerm(text.trim());
    this.setRequestVersion(this.requestVersion + 1);
    this.resetResults();

    if (text.trim().length < 1) {
      return;
    }

    const requestVersion = this.requestVersion;
    const debounceTimer = setTimeout(() => {
      this.setDebounceTimer(null);
      void this.executeSearch(requestVersion, text.trim());
    }, 300);
    this.setDebounceTimer(debounceTimer);
  }

  public async loadMore() {
    await this.loadNextPage(0);
  }

  private async loadNextPage(autoDepth: number) {
    if (
      this.isLoading ||
      this.isLoadingMore ||
      !this.hasMore ||
      this.searchTerm.length < 1
    ) {
      return;
    }

    const requestVersion = this.requestVersion;
    this.setLoadingMore(true);
    let pagePosts: CommunityPost[] = [];

    try {
      const result = await this.dispatcher.searchPosts(
        this.searchTerm,
        this.nextPage
      );

      if (requestVersion !== this.requestVersion) {
        return;
      }

      pagePosts = result.posts;
      this.setPosts([...this.posts, ...result.posts]);
      this.setHasMore(result.hasMore);
      this.setTotalHits(result.totalHits);
      this.setNextPage(this.nextPage + 1);
      this.setError(null);
    } catch (error) {
      if (requestVersion === this.requestVersion) {
        this.setError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.setLoadingMore(false);
    }

    await this.loadMoreIfAllBlocked(pagePosts, autoDepth);
  }

  // CM-17: 받은 한 페이지가 전부 차단한 사람 글이면 다음 페이지를 이어 받는다(연쇄 상한 있음).
  private async loadMoreIfAllBlocked(pagePosts: CommunityPost[], autoDepth: number) {
    const blockedUserStore = app.getBlockedUserStore();

    if (
      pagePosts.length === 0 ||
      !this.hasMore ||
      autoDepth >= BLOCKED_AUTO_PAGE_LIMIT ||
      !pagePosts.every(post => blockedUserStore?.isBlocked(post.getAuthorId()))
    ) {
      return;
    }

    await this.loadNextPage(autoDepth + 1);
  }

  public async retry() {
    if (this.searchTerm.length < 1 || this.isLoading || this.isLoadingMore) {
      return;
    }

    this.clearDebounceTimer();
    const requestVersion = this.requestVersion + 1;
    this.setRequestVersion(requestVersion);
    this.resetResults();
    await this.executeSearch(requestVersion, this.searchTerm);
  }

  public getQuery() {
    return this.query;
  }

  // 차단한 사람(CM-17)의 글을 뺀 결과. 결과 수(`totalHits`)는 서버 값 그대로 둔다.
  public getPosts() {
    return this.visiblePosts;
  }

  private get visiblePosts() {
    return (
      app.getBlockedUserStore()?.filterVisible(this.posts, post =>
        post.getAuthorId()
      ) ?? this.posts
    );
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

  public getError() {
    return this.error;
  }

  public getHasSearched() {
    return this.hasSearched;
  }

  public getTotalHits() {
    return this.totalHits;
  }

  private async executeSearch(requestVersion: number, query: string) {
    this.setLoading(true);

    let pagePosts: CommunityPost[] = [];

    try {
      const result = await this.dispatcher.searchPosts(query, 0);

      if (requestVersion !== this.requestVersion) {
        return;
      }

      pagePosts = result.posts;
      this.setPosts(result.posts);
      this.setHasMore(result.hasMore);
      this.setTotalHits(result.totalHits);
      this.setNextPage(1);
      this.setHasSearched(true);
      this.setError(null);
    } catch (error) {
      if (requestVersion === this.requestVersion) {
        this.setHasSearched(true);
        this.setError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      if (requestVersion === this.requestVersion) {
        this.setLoading(false);
      }
    }

    if (requestVersion === this.requestVersion) {
      await this.loadMoreIfAllBlocked(pagePosts, 0);
    }
  }

  private resetResults() {
    this.setPosts([]);
    this.setHasMore(false);
    this.setLoading(false);
    this.setLoadingMore(false);
    this.setError(null);
    this.setHasSearched(false);
    this.setTotalHits(0);
    this.setNextPage(0);
  }

  private clearDebounceTimer() {
    if (this.debounceTimer === null) {
      return;
    }

    clearTimeout(this.debounceTimer);
    this.setDebounceTimer(null);
  }

  private setQueryValue(value: string) {
    this.query = value;
  }

  private setSearchTerm(value: string) {
    this.searchTerm = value;
  }

  private setPosts(value: CommunityPost[]) {
    this.posts = value;
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

  private setError(value: Error | null) {
    this.error = value;
  }

  private setHasSearched(value: boolean) {
    this.hasSearched = value;
  }

  private setTotalHits(value: number) {
    this.totalHits = value;
  }

  private setNextPage(value: number) {
    this.nextPage = value;
  }

  private setRequestVersion(value: number) {
    this.requestVersion = value;
  }

  private setDebounceTimer(value: ReturnType<typeof setTimeout> | null) {
    this.debounceTimer = value;
  }
}

export default CommunitySearch;
