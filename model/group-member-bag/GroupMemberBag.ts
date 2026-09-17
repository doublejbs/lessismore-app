import { makeAutoObservable, runInAction } from 'mobx';
import { GroupBagSnapshot } from '@/model/group/GroupData';
import GroupMemberBagDispatcher from './GroupMemberBagDispatcher';

/**
 * 멤버 배낭 상세 모델 (GRP-5). **읽기 전용**이다.
 *
 * 그룹 하위의 공개 스냅샷만 읽는다 — 메모·좌표·이동 경로·건강 기록·개인 장비 사진은
 * 스냅샷에 애초에 담기지 않으므로 이 화면에는 표시할 것이 없다(DM-29 제외 목록).
 */
class GroupMemberBag {
  private snapshot: GroupBagSnapshot | null = null;
  private nickname = '';
  private loading = false;
  private initialized = false;
  private error: Error | null = null;
  private notFound = false;
  private notMember = false;

  public static from(
    dispatcher: GroupMemberBagDispatcher,
    groupId: string,
    uid: string
  ) {
    return new GroupMemberBag(dispatcher, groupId, uid);
  }

  private constructor(
    private readonly dispatcher: GroupMemberBagDispatcher,
    private readonly groupId: string,
    private readonly uid: string
  ) {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.load();
  }

  public async refresh(): Promise<void> {
    await this.load();
  }

  public getSnapshot(): GroupBagSnapshot | null {
    return this.snapshot;
  }

  public getNickname(): string {
    return this.nickname;
  }

  public isMine(): boolean {
    return this.dispatcher.getUserId() === this.uid;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getError(): Error | null {
    return this.error;
  }

  public isNotFound(): boolean {
    return this.notFound;
  }

  public isNotMember(): boolean {
    return this.notMember;
  }

  private async load() {
    this.setLoading(true);
    this.setError(null);

    try {
      const group = await this.dispatcher.getGroup(this.groupId);

      if (!group) {
        runInAction(() => {
          this.snapshot = null;
          this.notFound = true;
          this.notMember = false;
        });

        return;
      }

      if (!group.isMember(this.dispatcher.getUserId())) {
        runInAction(() => {
          this.snapshot = null;
          this.notFound = false;
          this.notMember = true;
        });

        return;
      }

      const [members, snapshots] = await Promise.all([
        this.dispatcher.getMembers(this.groupId),
        this.dispatcher.getMemberBags(this.groupId),
      ]);
      const member = members.find(item => item.getUid() === this.uid) ?? null;
      const snapshot =
        snapshots.find(item => item.uid === this.uid) ?? null;

      runInAction(() => {
        this.nickname = member?.getNickname() ?? '';
        this.snapshot = snapshot;
        this.notFound = snapshot === null;
        this.notMember = false;
      });
    } catch (error) {
      this.setError(error as Error);
    } finally {
      runInAction(() => {
        this.loading = false;
        this.initialized = true;
      });
    }
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setError(value: Error | null) {
    this.error = value;
  }
}

export default GroupMemberBag;
