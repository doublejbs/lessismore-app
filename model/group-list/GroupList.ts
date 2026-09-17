import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import Group from '@/model/group/Group';
import GroupListDispatcher from './GroupListDispatcher';

/**
 * 그룹 목록 도메인 모델 (GRP-1).
 *
 * 역인덱스(`users/{uid}/groups`)로 만든 **요약 Group**을 담는다 — `Group.isSummary()`가 true라
 * 멤버 목록·포인트·코스 수는 신뢰할 수 없다. 상세는 `GroupStore.getGroup()`이 다시 읽는다.
 */
class GroupList {
  private groups: Group[] = [];
  private isLoading = false;
  private error: Error | null = null;
  private initialized = false;
  private requestVersion = 0;

  public static from(dispatcher: GroupListDispatcher) {
    return new GroupList(dispatcher);
  }

  private constructor(private readonly dispatcher: GroupListDispatcher) {
    makeAutoObservable(this);
  }

  /**
   * 첫 조회. **비로그인 상태에서는 초기화하지 않는다** — 로그인 모달로 로그인하면
   * 화면이 다시 그려지면서 이 메서드가 그때 조회를 시작한다.
   */
  public async initialize() {
    if (this.initialized || !app.getFirebase().getUserId()) {
      return;
    }

    this.setInitialized(true);
    this.setLoading(true);
    await this.load();
  }

  // 로그아웃·탈퇴로 조회자가 사라졌을 때 목록을 비워 남의 자리에 남지 않게 한다.
  public reset() {
    if (!this.initialized && this.isEmpty() && !this.error) {
      return;
    }

    this.setRequestVersion(this.requestVersion + 1);
    this.setGroups([]);
    this.setError(null);
    this.setLoading(false);
    this.setInitialized(false);
  }

  // 화면 재진입·재시도 공통 경로. 로딩 스켈레톤은 첫 조회에서만 보여준다.
  public async refresh(quiet = false) {
    if (this.isLoading) {
      return;
    }

    if (!app.getFirebase().getUserId()) {
      this.setGroups([]);
      this.setError(null);

      return;
    }

    if (!quiet) {
      this.setLoading(true);
    }

    await this.load();
  }

  public getGroups() {
    return this.groups;
  }

  // 출발일이 가까운 순(GRP-1). 역인덱스 쿼리가 이미 startDate 오름차순이지만
  // 재시도·부분 갱신에서도 순서가 흔들리지 않게 화면 쪽에서도 고정한다.
  public getUpcomingGroups() {
    return this.groups
      .filter(group => !group.isPast())
      .sort((left, right) => this.compareUpcoming(left, right));
  }

  // 종료일이 지난 그룹은 `지난 그룹` 구분선 뒤에 최신순(= 최근에 끝난 순)으로 둔다(GRP-1).
  public getPastGroups() {
    return this.groups
      .filter(group => group.isPast())
      .sort((left, right) => this.comparePast(left, right));
  }

  public getIsLoading() {
    return this.isLoading;
  }

  public getError() {
    return this.error;
  }

  public getIsInitialized() {
    return this.initialized;
  }

  public isEmpty() {
    return this.groups.length === 0;
  }

  private async load() {
    const requestVersion = this.requestVersion + 1;

    this.setRequestVersion(requestVersion);

    try {
      const groups = await this.dispatcher.getMyGroups();

      if (requestVersion !== this.requestVersion) {
        return;
      }

      this.setGroups(groups);
      this.setError(null);
    } catch (error) {
      if (requestVersion !== this.requestVersion) {
        return;
      }

      console.error('그룹 목록 조회 실패:', error); // l10n-ignore: 개발자 로그
      this.setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (requestVersion === this.requestVersion) {
        this.setLoading(false);
      }
    }
  }

  // 출발일 오름차순. 같으면 종료일, 그것도 같으면 문서 ID 오름차순으로 타이브레이크한다(DM-25).
  private compareUpcoming(left: Group, right: Group) {
    if (left.getStartDate() !== right.getStartDate()) {
      return left.getStartDate() < right.getStartDate() ? -1 : 1;
    }

    if (left.getEndDate() !== right.getEndDate()) {
      return left.getEndDate() < right.getEndDate() ? -1 : 1;
    }

    return this.compareId(left, right);
  }

  // 종료일 내림차순. 같으면 출발일 내림차순, 그것도 같으면 문서 ID 오름차순이다(DM-25).
  private comparePast(left: Group, right: Group) {
    if (left.getEndDate() !== right.getEndDate()) {
      return left.getEndDate() > right.getEndDate() ? -1 : 1;
    }

    if (left.getStartDate() !== right.getStartDate()) {
      return left.getStartDate() > right.getStartDate() ? -1 : 1;
    }

    return this.compareId(left, right);
  }

  private compareId(left: Group, right: Group) {
    if (left.getId() === right.getId()) {
      return 0;
    }

    return left.getId() < right.getId() ? -1 : 1;
  }

  private setGroups(value: Group[]) {
    this.groups = value;
  }

  private setLoading(value: boolean) {
    this.isLoading = value;
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

export default GroupList;
