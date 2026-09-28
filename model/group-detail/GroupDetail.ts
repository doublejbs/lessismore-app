import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import Group from '@/model/group/Group';
import { GroupBagSnapshot } from '@/model/group/GroupData';
import GroupMember from '@/model/group/GroupMember';
import GroupMemberRole from '@/model/group/GroupMemberRole';
import { getGroupErrorMessage } from '@/model/group-error/GroupErrorMessage';
import GroupBagLinkFlow from '@/model/group-bag-link/GroupBagLinkFlow';
import StoredBagScheduleWriter from '@/model/group-bag-link/StoredBagScheduleWriter';
import GroupDetailDispatcher from './GroupDetailDispatcher';

/**
 * 그룹 상세 화면 모델 (GRP-4 · GRP-5 · GRP-7).
 *
 * 그룹 문서 → 멤버·배낭 스냅샷·박지를 읽어 한 화면을 구성한다. 배낭 스냅샷은 실시간
 * 구독이 아니라 쓰기 시점 동기화라, 상세 진입 때 본인 것만 **조용히** 다시 쓴다
 * (GRP-5 갱신 시점 ③) — 실패해도 화면을 막지 않는다.
 */
class GroupDetail {
  private group: Group | null = null;
  private members: GroupMember[] = [];
  private memberBags: GroupBagSnapshot[] = [];
  private campSpot: CampSpot | null = null;
  private myBags: BagItem[] = [];
  // 배낭 선택 시트의 `{그룹 이름}에 연결됨` 조각(GRP-5 한 배낭 = 한 그룹). 배낭 ID → 다른 그룹 이름들.
  private otherGroupNamesByBag: Map<string, string[]> = new Map();
  private loading = false;
  private initialized = false;
  private submitting = false;
  private error: Error | null = null;
  private notFound = false;
  private notMember = false;

  public static from(dispatcher: GroupDetailDispatcher, groupId: string) {
    return new GroupDetail(dispatcher, groupId, GroupBagLinkFlow.new());
  }

  private constructor(
    private readonly dispatcher: GroupDetailDispatcher,
    private readonly groupId: string,
    private readonly linkFlow: GroupBagLinkFlow
  ) {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.load(false);

    // 화면을 먼저 그린 뒤 배경으로 본인 스냅샷을 맞춘다(GRP-5 갱신 시점 ③).
    void this.syncMyBagSnapshot();
  }

  public async refresh(quiet = false): Promise<void> {
    await this.load(quiet);
  }

  public getGroupId(): string {
    return this.groupId;
  }

  public getGroup(): Group | null {
    return this.group;
  }

  public getMembers(): GroupMember[] {
    return this.members;
  }

  public getMemberBags(): GroupBagSnapshot[] {
    return this.memberBags;
  }

  public getCampSpot(): CampSpot | null {
    return this.campSpot;
  }

  public getMyBags(): BagItem[] {
    return this.myBags;
  }

  public getUserId(): string {
    return this.dispatcher.getUserId();
  }

  public getSnapshot(uid: string): GroupBagSnapshot | null {
    return this.memberBags.find(snapshot => snapshot.uid === uid) ?? null;
  }

  public isOwner(): boolean {
    return this.group?.isOwner(this.getUserId()) === true;
  }

  public getMyRole(): GroupMemberRole {
    return this.isOwner() ? GroupMemberRole.Owner : GroupMemberRole.Member;
  }

  // 일행 요약 (GRP-5): 멤버 수 · 연결된 배낭 수.
  public getLinkedBagCount(): number {
    return this.memberBags.length;
  }

  public getMemberCount(): number {
    return this.members.length || (this.group?.getMemberCount() ?? 0);
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  // 연결 흐름(옮기기·일정 맞춤)이 도는 동안에도 연결·해제 버튼을 막는다.
  public isSubmitting(): boolean {
    return this.submitting || this.linkFlow.isBusy();
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

  /**
   * 배낭 선택 시트용 목록. 시트를 열 때마다 다시 읽어 방금 만든 배낭도 보이게 한다.
   * 화면이 `void`로 부르므로 실패를 여기서 잡는다 — 놓치면 unhandled rejection이 나고
   * 시트는 조회 실패인데도 "배낭이 없어요"로 열린다.
   * 다른 그룹 연결 표시는 부가 정보라 따로 잡는다 — 실패해도 목록은 연다(옮기기 확인은 연결 흐름이 다시 본다).
   */
  public async loadMyBags(): Promise<void> {
    try {
      const [bags, otherGroupNamesByBag] = await Promise.all([
        this.dispatcher.getMyBags(),
        this.loadOtherGroupNamesByBag(),
      ]);

      runInAction(() => {
        this.myBags = bags;
        this.otherGroupNamesByBag = otherGroupNamesByBag;
      });
    } catch (error) {
      this.showError(error);
    }
  }

  // 배낭 선택 시트 메타 줄 조각 — 이 배낭이 **다른** 그룹에 연결돼 있으면 `{그룹 이름}에 연결됨`(GRP-5).
  public getBagLinkNote(bag: BagItem): string | null {
    const names = this.otherGroupNamesByBag.get(bag.getID());

    if (!names || names.length === 0) {
      return null;
    }

    const l10n = app.getL10n();

    return l10n.t('group.detail.bagLinkedTo', {
      name: names.join(l10n.t('group.link.nameSeparator')),
    });
  }

  /**
   * 내 배낭 연결 (GRP-5). 한 그룹 제약(옮기기 확인)과 일정 맞춤 확인은 배낭 상세와 같은
   * 연결 흐름이 맡는다. 이 화면에는 배낭 모델이 없어 일정은 저장 경로로 쓴다.
   */
  public async linkBag(bag: BagItem): Promise<void> {
    const group = this.group;

    if (this.isSubmitting() || !group) {
      return;
    }

    await this.linkFlow.start({
      group,
      subject: {
        bagId: bag.getID(),
        startDate: bag.getTripStart(),
        endDate: bag.getTripEnd(),
        location: bag.getLocation(),
      },
      writer: StoredBagScheduleWriter.of(bag.getID()),
      confirmReplace: false,
      onLinked: () => {
        app
          .getAnalyticsManager()
          ?.logClick('group_bag_link', { item_count: bag.getGearCount() });
      },
      onChanged: () => this.load(true),
    });
  }

  public async unlinkBag(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.unlinkBag(this.groupId);
      await this.load(true);
    } catch (error) {
      this.showError(error);
    } finally {
      this.setSubmitting(false);
    }
  }

  public async setInviteEnabled(enabled: boolean): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.setInviteEnabled(this.groupId, enabled);
      await this.load(true);
      app.getToastManager()?.showSimple(
        app
          .getL10n()
          .t(
            enabled
              ? 'group.detail.inviteUnlocked'
              : 'group.detail.inviteLocked'
          )
      );
    } catch (error) {
      this.showError(error);
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 멤버 내보내기 (GRP-4). 방장만 할 수 있고, 성공 여부를 돌려준다 —
   * 나가기·해산과 달리 화면을 떠나지 않으므로 성공하면 목록을 조용히 다시 읽는다.
   *
   * 대상의 역인덱스(`users/{uid}/groups/{groupId}`)는 클라이언트가 지울 수 없어
   * 서버 트리거 몫이다(DM-29) — 여기서 보정하지 않는다.
   */
  public async removeMember(uid: string): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.removeMember(this.groupId, uid);
      app.getAnalyticsManager()?.logClick('group_member_remove');
      await this.load(true);

      return true;
    } catch (error) {
      this.showError(error);

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 나가기·해산 (GRP-12). 성공 여부를 돌려주고 화면 이동은 View가 한다 —
   * 실패하면 화면 상태를 그대로 두고 토스트로만 알린다.
   */
  public async leaveGroup(): Promise<boolean> {
    return this.runMembershipAction(() =>
      this.dispatcher.leaveGroup(this.groupId)
    );
  }

  public async deleteGroup(): Promise<boolean> {
    return this.runMembershipAction(() =>
      this.dispatcher.deleteGroup(this.groupId)
    );
  }

  private async runMembershipAction(action: () => Promise<void>) {
    if (this.submitting) {
      return false;
    }

    const role = this.getMyRole();

    this.setSubmitting(true);

    try {
      await action();
      app.getAnalyticsManager()?.logClick('group_leave', { role });

      return true;
    } catch (error) {
      this.showError(error);

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  private async load(quiet: boolean) {
    if (!quiet) {
      this.setLoading(true);
    }

    this.setError(null);

    try {
      const group = await this.dispatcher.getGroup(this.groupId);

      if (!group) {
        runInAction(() => {
          this.group = null;
          this.notFound = true;
          this.notMember = false;
        });

        return;
      }

      if (!group.isMember(this.getUserId())) {
        runInAction(() => {
          this.group = null;
          this.notFound = false;
          this.notMember = true;
        });

        return;
      }

      const campSpotId = group.getCampSpotId();
      const [members, memberBags, campSpot] = await Promise.all([
        this.dispatcher.getMembers(this.groupId),
        this.dispatcher.getMemberBags(this.groupId),
        campSpotId
          ? this.dispatcher.getCampSpot(campSpotId)
          : Promise.resolve(null),
      ]);

      runInAction(() => {
        this.group = group;
        this.members = members;
        this.memberBags = memberBags;
        this.campSpot = campSpot;
        this.notFound = false;
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

  // 역인덱스 1회 조회로 배낭 → 연결된 다른 그룹 이름을 만든다(배낭마다 조회하지 않는다).
  private async loadOtherGroupNamesByBag(): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    try {
      const groups = await this.dispatcher.getMyGroups();

      groups.forEach(group => {
        const bagId = group.getMyBagId();

        if (!bagId || group.getId() === this.groupId) {
          return;
        }

        result.set(bagId, [...(result.get(bagId) ?? []), group.getName()]);
      });
    } catch (error) {
      console.warn('[GroupDetail] linked groups load failed', error); // l10n-ignore: 개발자 로그
    }

    return result;
  }

  private async syncMyBagSnapshot() {
    if (!this.group) {
      return;
    }

    try {
      await this.dispatcher.syncMyBagSnapshot(this.groupId);
      await this.load(true);
    } catch (error) {
      // 배경 동기화다 — 실패해도 화면을 막지 않는다(GRP-5).
      console.warn('그룹 배낭 스냅샷 동기화 실패:', error); // l10n-ignore: 개발자 로그
    }
  }

  private showError(error: unknown) {
    app.getToastManager()?.showSimple(getGroupErrorMessage(error));
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setSubmitting(value: boolean) {
    this.submitting = value;
  }

  private setError(value: Error | null) {
    this.error = value;
  }
}

export default GroupDetail;
