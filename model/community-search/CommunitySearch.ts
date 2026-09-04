import { makeAutoObservable } from 'mobx';
import CommunityPost from '@/model/community/CommunityPost';
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

    try {
      const result = await this.dispatcher.searchPosts(
        this.searchTerm,
        this.nextPage
      );

      if (requestVersion !== this.requestVersion) {
        return;
      }

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

    try {
      const result = await this.dispatcher.searchPosts(query, 0);

      if (requestVersion !== this.requestVersion) {
        return;
      }

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
