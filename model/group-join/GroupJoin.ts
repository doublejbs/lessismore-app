import { makeAutoObservable, runInAction } from 'mobx';
import Group from '@/model/group/Group';
import GroupJoinDispatcher from './GroupJoinDispatcher';
import GroupJoinStatus from './GroupJoinStatus';

/**
 * 초대 수락 도메인 모델 (GRP-3).
 *
 * **확인 없이 가입시키지 않는다** — `initialize()`는 그룹을 읽어 보여줄 준비만 하고,
 * 실제 가입은 사용자가 `참여하기`를 눌러 `join()`을 부를 때만 일어난다.
 */
class GroupJoin {
  public static from(dispatcher: GroupJoinDispatcher): GroupJoin {
    return new GroupJoin(dispatcher);
  }

  private status = GroupJoinStatus.Loading;
  private group: Group | null = null;
  private joining = false;

  private constructor(private readonly dispatcher: GroupJoinDispatcher) {
    makeAutoObservable(this);
  }

  public getStatus() {
    return this.status;
  }

  public getGroup(): Group | null {
    return this.group;
  }

  public getIsJoining() {
    return this.joining;
  }

  // 로그인 전에는 그룹을 읽을 권한이 없다 — 조회를 시도하지 않고 로그인 안내만 세운다.
  public markNeedLogin() {
    this.setStatus(GroupJoinStatus.NeedLogin);
    this.setGroup(null);
  }

  public async initialize(groupId: string): Promise<void> {
    if (!groupId) {
      this.setStatus(GroupJoinStatus.InvalidLink);

      return;
    }

    this.setStatus(GroupJoinStatus.Loading);

    try {
      const group = await this.dispatcher.getGroup(groupId);

      runInAction(() => {
        this.setGroup(group);
        this.setStatus(this.resolveStatus(group));
      });
    } catch (error) {
      console.error('그룹 초대 조회 실패:', error); // l10n-ignore: 개발자 로그

      runInAction(() => {
        this.setStatus(GroupJoinStatus.LoadFailed);
      });
    }
  }

  /**
   * 참여한다. 성공하면 그룹 ID를 돌려주고, 실패는 `GroupError`로 올라간다.
   * 화면은 실패 코드를 문구로 바꿔 보여주고 상태를 다시 읽는다.
   */
  public async join(): Promise<string | null> {
    const group = this.group;

    if (!group || this.joining) {
      return null;
    }

    this.setJoining(true);

    try {
      await this.dispatcher.joinGroup(group.getId());

      return group.getId();
    } finally {
      runInAction(() => {
        this.setJoining(false);
      });
    }
  }

  /**
   * 참여 가능 여부 판정.
   * 잠금과 정원이 동시에 해당하면 **잠금을 먼저** 알린다 — `GroupStore.joinGroup()`이
   * 같은 순서로 거절하므로, 화면에 보이는 이유와 실제 거절 이유가 어긋나지 않는다.
   */
  private resolveStatus(group: Group | null): GroupJoinStatus {
    if (!group) {
      return GroupJoinStatus.NotFound;
    }

    if (group.isMember(this.dispatcher.getUserId())) {
      return GroupJoinStatus.AlreadyMember;
    }

    if (!group.getInviteEnabled()) {
      return GroupJoinStatus.InviteDisabled;
    }

    if (group.isFull()) {
      return GroupJoinStatus.Full;
    }

    return GroupJoinStatus.Ready;
  }

  private setStatus(status: GroupJoinStatus) {
    this.status = status;
  }

  private setGroup(group: Group | null) {
    this.group = group;
  }

  private setJoining(joining: boolean) {
    this.joining = joining;
  }
}

export default GroupJoin;
