import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  DocumentData,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { toFirestoreDate } from '../firebase/FirestoreDate';
import { RouteCoordinate, RouteInput } from '../route/RouteData';
import Firebase from '../firebase/Firebase';
import BagStore from './BagStore';
import Group from '../group/Group';
import GroupBagSnapshotBuilder from '../group/GroupBagSnapshotBuilder';
import {
  GroupBagSnapshot,
  GroupBagSnapshotContent,
  GroupCreateInput,
  GroupData,
  GroupIndexData,
  GroupMemberData,
  GroupPatch,
  GroupPointData,
  GroupPointInput,
  GroupPointPatch,
  GroupRouteData,
} from '../group/GroupData';
import GroupError from '../group/GroupError';
import {
  GROUP_MAX_MEMBER_COUNT,
  GROUP_MAX_PER_USER,
  GROUP_MAX_POINT_COUNT,
  GROUP_MAX_ROUTE_COUNT,
  GROUP_ROUTE_MAX_SIMPLIFIED_POINTS,
} from '../group/GroupLimits';
import GroupMember from '../group/GroupMember';
import GroupMemberRole from '../group/GroupMemberRole';
import GroupPoint from '../group/GroupPoint';
import GroupPointType from '../group/GroupPointType';
import GroupRoute from '../group/GroupRoute';
import RouteDirectionStore from '../route/RouteDirectionStore';
import GroupValidationError from '../group/GroupValidationError';
import GroupValidator from '../group/GroupValidator';
import RouteValidator from '../route/RouteValidator';

/**
 * 그룹 데이터 CRUD (GRP-1~GRP-9, DM-29).
 *
 * 화면은 이 스토어만 호출하고 Firestore 경로를 직접 알지 않는다.
 * 경로: `groups/{groupId}` · `groups/{groupId}/members/{uid}` · `groups/{groupId}/bags/{uid}`
 *      · `groups/{groupId}/points/{pointId}` · `groups/{groupId}/routes/{routeId}`
 *      · `users/{uid}/groups/{groupId}`(역인덱스)
 *
 * 클라이언트 권한의 한계로 **남의 문서**는 쓰지 못한다. 다음은 서버(별도 레포 `lessismore`의
 * `functions/`, DM-29 "서버 작업")의 몫이며 이 스토어는 본인 문서만 갱신한다.
 * - 그룹 이름·기간 변경 시 다른 멤버의 역인덱스 갱신
 * - 멤버 내보내기 시 대상의 역인덱스 삭제
 * - 그룹 해산 시 하위 컬렉션(members·bags·points·routes)과 Storage GPX 정리
 * - 회원 탈퇴 시 소속 그룹 정리
 */
class GroupStore {
  public constructor(
    private readonly firebase: Firebase,
    private readonly bagStore: BagStore,
    // 코스 뒤집기(GRP-8)는 기기 설정이다. 코스 모델이 방향을 읽을 수 있게 만들 때 넘긴다.
    private readonly routeDirections: RouteDirectionStore | null = null
  ) {}

  private createGroupId() {
    return doc(collection(this.getStore(), 'groups')).id;
  }

  private createPointId(groupId: string) {
    return doc(collection(this.getStore(), 'groups', groupId, 'points')).id;
  }

  // 코스는 Storage 경로에 routeId가 들어가므로 업로드 전에 id를 먼저 발급받는다(GRP-8).
  public createRouteId(groupId: string) {
    return doc(collection(this.getStore(), 'groups', groupId, 'routes')).id;
  }

  public getRouteStoragePath(groupId: string, routeId: string) {
    return `groups/${groupId}/routes/${routeId}.gpx`;
  }

  public async createGroup(input: GroupCreateInput): Promise<string> {
    const userId = this.requireUserId();

    GroupValidator.validateName(input.name);
    GroupValidator.validateDateRange(input.startDate, input.endDate);
    await this.assertGroupQuota(userId);

    const groupId = this.createGroupId();
    const name = input.name.trim();
    const destinationName = input.destinationName?.trim();
    const groupData: Record<string, unknown> = {
      name,
      startDate: input.startDate,
      endDate: input.endDate,
      ownerId: userId,
      memberIds: [userId],
      memberCount: 1,
      inviteEnabled: true,
      pointCount: 0,
      routeCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.campSpotId) {
      groupData.campSpotId = input.campSpotId;
    }

    if (destinationName) {
      groupData.destinationName = destinationName;
    }

    const batch = writeBatch(this.getStore());

    batch.set(this.groupRef(groupId), groupData);
    batch.set(this.memberRef(groupId, userId), {
      uid: userId,
      nickname: this.firebase.getNickname(),
      role: GroupMemberRole.Owner,
      joinedAt: serverTimestamp(),
    });
    batch.set(
      this.indexRef(userId, groupId),
      this.toIndexData({
        name,
        startDate: input.startDate,
        endDate: input.endDate,
        role: GroupMemberRole.Owner,
        ownerId: userId,
        memberCount: 1,
        hasBag: false,
        ...(input.campSpotId ? { campSpotId: input.campSpotId } : {}),
        ...(destinationName ? { destinationName } : {}),
      })
    );

    await batch.commit();

    return groupId;
  }

  public async getGroup(groupId: string): Promise<Group | null> {
    const snapshot = await getDoc(this.groupRef(groupId));

    if (!snapshot.exists()) {
      return null;
    }

    return Group.from(this.toGroupData(snapshot.id, snapshot.data()));
  }

  /**
   * 내가 속한 그룹 목록 (GRP-1).
   * 역인덱스만 읽어 목록을 그린다 — 그룹 문서를 멤버 수만큼 다시 읽지 않는다.
   * 따라서 인스턴스는 요약본(`isSummary()`)이고 포인트·코스 수는 0으로 온다.
   */
  public async getMyGroups(): Promise<Group[]> {
    const userId = this.requireUserId();
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'users', userId, 'groups'),
        orderBy('startDate', 'asc')
      )
    );

    return snapshot.docs.map(item =>
      Group.fromIndex(this.toIndexDataFromDoc(item.id, item.data()), userId)
    );
  }

  /**
   * 그룹 정보 수정 (GRP-7). 방장만 가능하다.
   * 이름·기간이 바뀌면 **다른 멤버의 역인덱스도 갱신해야 하지만** 클라이언트는 남의 문서를 쓰지 못한다.
   * 여기서는 본인 역인덱스만 맞추고, 나머지 멤버 갱신은 서버 트리거의 몫이다(DM-29 서버 작업).
   */
  public async updateGroup(groupId: string, patch: GroupPatch) {
    const userId = this.requireUserId();
    const snapshot = await getDoc(this.groupRef(groupId));

    if (!snapshot.exists()) {
      throw new GroupError(GroupValidationError.GroupNotFound);
    }

    const current = this.toGroupData(snapshot.id, snapshot.data());

    if (current.ownerId !== userId) {
      throw new GroupError(GroupValidationError.NotOwner);
    }

    const name = patch.name !== undefined ? patch.name.trim() : current.name;
    const startDate = patch.startDate ?? current.startDate;
    const endDate = patch.endDate ?? current.endDate;

    if (patch.name !== undefined) {
      GroupValidator.validateName(patch.name);
    }

    if (patch.startDate !== undefined || patch.endDate !== undefined) {
      GroupValidator.validateDateRange(startDate, endDate);
    }

    if (patch.meetingNote) {
      GroupValidator.validateMeetingNote(patch.meetingNote);
    }

    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const indexUpdates: Record<string, unknown> = {};

    if (patch.name !== undefined) {
      updates.name = name;
      indexUpdates.name = name;
    }

    if (patch.startDate !== undefined) {
      updates.startDate = startDate;
      indexUpdates.startDate = startDate;
    }

    if (patch.endDate !== undefined) {
      updates.endDate = endDate;
      indexUpdates.endDate = endDate;
    }

    if (patch.campSpotId !== undefined) {
      // 빈 문자열도 연결 해제로 본다 — destinationName 과 같은 규칙이다.
      const campSpotId = patch.campSpotId?.trim();

      updates.campSpotId = campSpotId || deleteField();
      indexUpdates.campSpotId = campSpotId || deleteField();
    }

    if (patch.destinationName !== undefined) {
      const destinationName = patch.destinationName?.trim();

      updates.destinationName = destinationName || deleteField();
      indexUpdates.destinationName = destinationName || deleteField();
    }

    if (patch.meetingNote !== undefined) {
      const meetingNote = patch.meetingNote?.trim();

      updates.meetingNote = meetingNote || deleteField();
    }

    if (patch.inviteEnabled !== undefined) {
      updates.inviteEnabled = patch.inviteEnabled;
    }

    // 그룹 문서와 내 역인덱스를 한 배치로 커밋한다 — 따로 쓰면 뒤가 실패했을 때
    // 그룹만 바뀌고 목록 행은 낡은 값으로 남는다.
    const batch = writeBatch(this.getStore());

    batch.update(this.groupRef(groupId), updates);

    if (Object.keys(indexUpdates).length > 0) {
      batch.set(this.indexRef(userId, groupId), indexUpdates, { merge: true });
    }

    await batch.commit();
  }

  public async setInviteEnabled(groupId: string, enabled: boolean) {
    await this.updateGroup(groupId, { inviteEnabled: enabled });
  }

  /**
   * 초대 링크로 참여 (GRP-3).
   * 그룹 문서 갱신은 `memberIds`에 **자기 uid 하나만** 더하는 모양이라 보안 규칙만으로 검증된다(DM-29).
   */
  public async joinGroup(groupId: string): Promise<void> {
    const userId = this.requireUserId();

    await this.assertGroupQuota(userId);

    const nickname = this.firebase.getNickname();

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(this.groupRef(groupId));

      if (!snapshot.exists()) {
        throw new GroupError(GroupValidationError.GroupNotFound);
      }

      const group = this.toGroupData(snapshot.id, snapshot.data());

      if (group.memberIds.includes(userId)) {
        throw new GroupError(GroupValidationError.AlreadyMember);
      }

      if (!group.inviteEnabled) {
        throw new GroupError(GroupValidationError.InviteDisabled);
      }

      if (group.memberIds.length >= GROUP_MAX_MEMBER_COUNT) {
        throw new GroupError(GroupValidationError.GroupFull);
      }

      transaction.update(this.groupRef(groupId), {
        memberIds: arrayUnion(userId),
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      transaction.set(this.memberRef(groupId, userId), {
        uid: userId,
        nickname,
        role: GroupMemberRole.Member,
        joinedAt: serverTimestamp(),
      });
      transaction.set(
        this.indexRef(userId, groupId),
        this.toIndexData({
          name: group.name,
          startDate: group.startDate,
          endDate: group.endDate,
          role: GroupMemberRole.Member,
          ownerId: group.ownerId,
          // 캐시 필드(memberCount)가 아니라 멤버 배열 길이로 센다 — 드리프트에 강하다.
          memberCount: group.memberIds.length + 1,
          hasBag: false,
          ...(group.campSpotId ? { campSpotId: group.campSpotId } : {}),
          ...(group.destinationName
            ? { destinationName: group.destinationName }
            : {}),
        })
      );
    });
  }

  /**
   * 그룹 나가기 (GRP-4). 방장은 해산을 거쳐야 하므로 거절한다.
   * 나가는 사람의 배낭 스냅샷을 함께 지우고, 그가 올린 포인트·코스는 남긴다.
   *
   * `joinGroup`과 같이 **트랜잭션 안에서 `memberIds`를 다시 본다** — `arrayRemove`는 멱등인데
   * `memberCount: increment(-1)`은 아니라, 더블탭·재시도나 "방장 내보내기 + 본인 나가기"가 겹치면
   * 배열은 한 번만 줄고 카운트는 두 번 줄어 실제보다 작아진다.
   * 이미 빠져 있으면 **조용히 성공**시키고 내 하위 문서·역인덱스만 치운다 — 방장이 먼저 내보낸 뒤
   * 남아 있는 내 역인덱스를 지울 유일한 경로이고, 결과(내가 그룹에 없음)도 요청과 같다.
   */
  public async leaveGroup(groupId: string): Promise<void> {
    const userId = this.requireUserId();

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(this.groupRef(groupId));

      if (!snapshot.exists()) {
        throw new GroupError(GroupValidationError.GroupNotFound);
      }

      const group = this.toGroupData(snapshot.id, snapshot.data());

      if (group.ownerId === userId) {
        throw new GroupError(GroupValidationError.OwnerCannotLeave);
      }

      if (group.memberIds.includes(userId)) {
        transaction.update(this.groupRef(groupId), {
          memberIds: arrayRemove(userId),
          memberCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      }

      transaction.delete(this.memberRef(groupId, userId));
      transaction.delete(this.bagRef(groupId, userId));
      transaction.delete(this.indexRef(userId, groupId));
    });
  }

  /**
   * 멤버 내보내기 (GRP-4). 방장만 가능하다.
   * 대상의 역인덱스(`users/{uid}/groups/{groupId}`)는 남의 문서라 클라이언트가 지우지 못한다 —
   * `memberIds` 변경을 보는 서버 트리거가 정리한다(DM-29 서버 작업).
   */
  public async removeMember(groupId: string, uid: string): Promise<void> {
    const userId = this.requireUserId();

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(this.groupRef(groupId));

      if (!snapshot.exists()) {
        throw new GroupError(GroupValidationError.GroupNotFound);
      }

      const group = this.toGroupData(snapshot.id, snapshot.data());

      if (group.ownerId !== userId) {
        throw new GroupError(GroupValidationError.NotOwner);
      }

      if (uid === group.ownerId) {
        throw new GroupError(GroupValidationError.OwnerCannotBeRemoved);
      }

      // 나가기와 같은 이유로 트랜잭션 안에서 다시 본다(카운트는 멱등하지 않다).
      // 이미 빠진 멤버면 카운트를 건드리지 않고 남은 하위 문서만 치운다.
      if (group.memberIds.includes(uid)) {
        transaction.update(this.groupRef(groupId), {
          memberIds: arrayRemove(uid),
          memberCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      }

      transaction.delete(this.memberRef(groupId, uid));
      transaction.delete(this.bagRef(groupId, uid));
    });
  }

  /**
   * 그룹 해산 (GRP-4, GRP-12). 방장만 가능하다.
   * 클라이언트는 그룹 문서와 **본인** 하위 문서·역인덱스만 즉시 지운다. 나머지 멤버의 문서,
   * 포인트·코스, Storage GPX 정리는 그룹 문서 삭제를 보는 서버 트리거가 맡는다(DM-29).
   */
  public async deleteGroup(groupId: string): Promise<void> {
    const userId = this.requireUserId();
    const snapshot = await getDoc(this.groupRef(groupId));

    if (!snapshot.exists()) {
      throw new GroupError(GroupValidationError.GroupNotFound);
    }

    const group = this.toGroupData(snapshot.id, snapshot.data());

    if (group.ownerId !== userId) {
      throw new GroupError(GroupValidationError.NotOwner);
    }

    const batch = writeBatch(this.getStore());

    batch.delete(this.memberRef(groupId, userId));
    batch.delete(this.bagRef(groupId, userId));
    batch.delete(this.indexRef(userId, groupId));
    batch.delete(this.groupRef(groupId));

    await batch.commit();
  }

  // 멤버 목록 (GRP-4): 방장을 맨 위에 두고 나머지는 참여 순서.
  public async getMembers(groupId: string): Promise<GroupMember[]> {
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'groups', groupId, 'members'),
        orderBy('joinedAt', 'asc')
      )
    );
    const members = snapshot.docs.map(item =>
      GroupMember.from(this.toMemberData(item.id, item.data()))
    );

    return [
      ...members.filter(member => member.isOwner()),
      ...members.filter(member => !member.isOwner()),
    ];
  }

  /**
   * 내 배낭 연결 (GRP-5). 공개용 스냅샷을 그룹 하위에 쓰고 그룹원은 이것만 읽는다 —
   * `bag/{bagId}` 자체에는 그룹원 읽기 권한을 주지 않는다(메모·좌표·건강 기록이 함께 들어 있다).
   */
  public async linkBag(groupId: string, bagId: string): Promise<void> {
    const userId = this.requireUserId();

    await this.assertMembership(groupId, userId);

    const content = await this.buildSnapshotContent(bagId);

    await this.writeSnapshot(groupId, userId, content);
  }

  public async unlinkBag(groupId: string): Promise<void> {
    const userId = this.requireUserId();

    await this.assertMembership(groupId, userId);

    const batch = writeBatch(this.getStore());

    batch.delete(this.bagRef(groupId, userId));
    batch.update(this.memberRef(groupId, userId), { bagId: deleteField() });
    batch.set(
      this.indexRef(userId, groupId),
      { hasBag: false, bagId: deleteField() },
      { merge: true }
    );

    await batch.commit();
  }

  /**
   * 이 배낭을 연결한 **모든 그룹**의 스냅샷을 다시 쓴다 (GRP-5 갱신 시점 ① 배낭 편집 확인 ② 배낭 정보 수정).
   * 대상 그룹은 역인덱스의 `bagId`로 찾는다 — 그룹마다 `members/{uid}`를 읽지 않는다.
   * 한 그룹이 실패해도(내보내진 그룹의 역인덱스가 남은 경우 등) 나머지를 계속 쓴다.
   * 다만 **스냅샷 내용을 못 만들면**(배낭이 사라진 경우 등) 쓸 것이 없으므로 그대로 올린다 —
   * 배경 호출은 `syncBagSnapshotsInBackground`를 쓰고 거기서 받는다.
   */
  public async syncBagSnapshots(bagId: string): Promise<void> {
    if (!bagId) {
      return;
    }

    const userId = this.requireUserId();
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'users', userId, 'groups'),
        where('bagId', '==', bagId)
      )
    );

    if (snapshot.empty) {
      return;
    }

    // 스냅샷 내용은 그룹과 무관하다 — **한 번만** 만들어 그룹 수만큼 쓰기만 한다.
    // 그룹마다 다시 만들면 배낭 하나를 고칠 때 사용자 문서·배낭 문서·장비 쿼리가 그룹 수만큼 반복된다.
    const content = await this.buildSnapshotContent(bagId);

    await Promise.all(
      snapshot.docs.map(async item => {
        try {
          await this.writeSnapshot(item.id, userId, content);
        } catch (error) {
          // 내보내진 그룹의 역인덱스가 아직 남아 있는 경우 등. 나머지 그룹 갱신을 막지 않는다.
          console.warn('[GroupStore] bag snapshot sync failed', item.id, error);
        }
      })
    );
  }

  /**
   * 이 배낭을 연결한 그룹 목록 (BD-11 `그룹에 올리기` · 연결 그룹 코스).
   * `syncBagSnapshots`와 **같은 쿼리**(역인덱스의 `bagId`)를 쓴다 — 배낭이 어느 그룹에 물려
   * 있는지를 아는 방법을 두 개 두지 않는다. 돌려주는 `Group`은 역인덱스 요약본이다(DM-29).
   */
  public async getGroupsByBag(bagId: string): Promise<Group[]> {
    if (!bagId) {
      return [];
    }

    const userId = this.requireUserId();
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'users', userId, 'groups'),
        where('bagId', '==', bagId)
      )
    );

    return snapshot.docs.map(item =>
      Group.fromIndex(this.toIndexDataFromDoc(item.id, item.data()), userId)
    );
  }

  /**
   * 배낭 편집·정보 수정 뒤에 따라붙는 **배경** 동기화 (GRP-5 갱신 시점 ①②).
   * 사용자 조작을 막지 않도록 기다리지 않고, 실패해도 그 조작의 결과를 되돌리지 않는다 —
   * 배낭 화면들이 같은 모양을 각자 적어 두지 않게 여기에 둔다.
   */
  public syncBagSnapshotsInBackground(bagId: string): void {
    void this.syncBagSnapshots(bagId).catch(error => {
      console.warn('[GroupStore] background bag snapshot sync failed', error);
    });
  }

  /**
   * 내 스냅샷 재동기화 (GRP-5 갱신 시점 ③ 그룹 상세 진입).
   * 배낭이 사라졌거나 내 것이 아니게 됐으면 **조용히** 연결을 해제한다 — 통신 실패·권한 거부는
   * 그대로 올려 연결을 지킨다(GRP-5 엣지 케이스).
   * 배낭 쪽에서 시작하는 갱신(시점 ①②)은 `syncBagSnapshots(bagId)`를 쓴다.
   */
  public async syncMyBagSnapshot(groupId: string): Promise<void> {
    const userId = this.requireUserId();
    const snapshot = await getDoc(this.memberRef(groupId, userId));

    if (!snapshot.exists()) {
      throw new GroupError(GroupValidationError.NotMember);
    }

    const bagId = snapshot.data().bagId;

    if (typeof bagId !== 'string' || !bagId) {
      return;
    }

    try {
      await this.linkBag(groupId, bagId);
    } catch (error) {
      if (
        error instanceof GroupError &&
        error.code === GroupValidationError.BagNotFound
      ) {
        await this.unlinkBag(groupId);

        return;
      }

      throw error;
    }
  }

  public async getMemberBags(groupId: string): Promise<GroupBagSnapshot[]> {
    const snapshot = await getDocs(
      collection(this.getStore(), 'groups', groupId, 'bags')
    );

    return snapshot.docs.flatMap(item => {
      const bagSnapshot = GroupBagSnapshotBuilder.fromFirestore(
        item.id,
        item.data()
      );

      return bagSnapshot ? [bagSnapshot] : [];
    });
  }

  public async getPoints(groupId: string): Promise<GroupPoint[]> {
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'groups', groupId, 'points'),
        orderBy('createdAt', 'asc')
      )
    );

    return snapshot.docs.map(item =>
      GroupPoint.from(this.toPointData(item.id, item.data()))
    );
  }

  // 포인트 추가 (GRP-9). 상한 검사와 `pointCount` 증가를 한 트랜잭션에서 처리한다.
  public async createPoint(
    groupId: string,
    input: GroupPointInput
  ): Promise<string> {
    const userId = this.requireUserId();

    GroupValidator.validatePointTitle(input.title);

    if (input.description) {
      GroupValidator.validatePointDescription(input.description);
    }

    const pointId = this.createPointId(groupId);
    const authorName = this.firebase.getNickname();
    const description = input.description?.trim();

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(this.groupRef(groupId));

      if (!snapshot.exists()) {
        throw new GroupError(GroupValidationError.GroupNotFound);
      }

      const group = this.toGroupData(snapshot.id, snapshot.data());

      this.assertMember(group, userId);

      if (group.pointCount >= GROUP_MAX_POINT_COUNT) {
        throw new GroupError(GroupValidationError.PointLimitExceeded);
      }

      const pointData: Record<string, unknown> = {
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        title: input.title.trim(),
        authorId: userId,
        authorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (description) {
        pointData.description = description;
      }

      transaction.set(this.pointRef(groupId, pointId), pointData);
      transaction.update(this.groupRef(groupId), {
        pointCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    });

    return pointId;
  }

  public async updatePoint(
    groupId: string,
    pointId: string,
    patch: GroupPointPatch
  ): Promise<void> {
    const userId = this.requireUserId();

    if (patch.title !== undefined) {
      GroupValidator.validatePointTitle(patch.title);
    }

    if (patch.description) {
      GroupValidator.validatePointDescription(patch.description);
    }

    const [groupSnapshot, snapshot] = await Promise.all([
      getDoc(this.groupRef(groupId)),
      getDoc(this.pointRef(groupId, pointId)),
    ]);

    if (!groupSnapshot.exists()) {
      throw new GroupError(GroupValidationError.GroupNotFound);
    }

    if (!snapshot.exists()) {
      throw new GroupError(GroupValidationError.PointNotFound);
    }

    const groupData = this.toGroupData(groupSnapshot.id, groupSnapshot.data());
    const point = GroupPoint.from(
      this.toPointData(snapshot.id, snapshot.data())
    );

    // 내보내진 멤버가 자기가 올린 포인트를 고치는 경우다 — 먼저 보지 않으면 규칙이 거부한
    // 원시 Firestore 권한 오류가 화면까지 올라간다(createPoint·linkBag과 같은 이유).
    this.assertMember(groupData, userId);

    // 작성자도 방장도 아닐 때다 — 방장 전용 액션의 NotOwner와 구분한다(GRP-4).
    if (!point.canEdit(userId, Group.from(groupData))) {
      throw new GroupError(GroupValidationError.NotAuthor);
    }

    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (patch.type !== undefined) {
      updates.type = patch.type;
    }

    if (patch.title !== undefined) {
      updates.title = patch.title.trim();
    }

    if (patch.description !== undefined) {
      const description = patch.description?.trim();

      updates.description = description || deleteField();
    }

    await updateDoc(this.pointRef(groupId, pointId), updates);
  }

  public async deletePoint(groupId: string, pointId: string): Promise<void> {
    const userId = this.requireUserId();

    await runTransaction(this.getStore(), async transaction => {
      // 트랜잭션 안에서도 "읽기 먼저, 쓰기 나중" 계약은 지켜지므로 두 읽기를 병렬로 돌린다.
      const [groupSnapshot, pointSnapshot] = await Promise.all([
        transaction.get(this.groupRef(groupId)),
        transaction.get(this.pointRef(groupId, pointId)),
      ]);

      if (!groupSnapshot.exists()) {
        throw new GroupError(GroupValidationError.GroupNotFound);
      }

      if (!pointSnapshot.exists()) {
        throw new GroupError(GroupValidationError.PointNotFound);
      }

      const groupData = this.toGroupData(
        groupSnapshot.id,
        groupSnapshot.data()
      );
      const point = GroupPoint.from(
        this.toPointData(pointSnapshot.id, pointSnapshot.data())
      );

      this.assertMember(groupData, userId);

      if (!point.canEdit(userId, Group.from(groupData))) {
        throw new GroupError(GroupValidationError.NotAuthor);
      }

      transaction.delete(this.pointRef(groupId, pointId));
      transaction.update(this.groupRef(groupId), {
        pointCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    });
  }

  public async getRoutes(groupId: string): Promise<GroupRoute[]> {
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'groups', groupId, 'routes'),
        orderBy('createdAt', 'asc')
      )
    );

    return snapshot.docs.map(item =>
      GroupRoute.from(
        this.toRouteData(item.id, item.data()),
        this.routeDirections
      )
    );
  }

  /**
   * 코스 등록 (GRP-8). GPX 파싱과 Storage 업로드는 호출자가 끝낸 뒤 요약만 넘긴다 —
   * 이 스토어는 Firestore 문서만 쓴다.
   */
  public async createRoute(
    groupId: string,
    input: RouteInput
  ): Promise<string> {
    const userId = this.requireUserId();

    // 보안 규칙 isValidRoutePayload 와 같은 조건으로 미리 거른다 — 업로드는 이미 끝난 뒤라
    // 여기서 거부되면 회수 경로 없는 고아 GPX가 남는다(GRP-8). 업로더도 업로드 전에 같은 것을 부른다.
    RouteValidator.validateRoute(input);

    const authorName = this.firebase.getNickname();
    const name = RouteValidator.toRouteName(input.name);
    // 축약 좌표는 파서가 500점 이하로 줄여 넘기지만, 1MB 문서 한도를 지키는 마지막 방어선을 둔다.
    const simplified = input.simplified
      .slice(0, GROUP_ROUTE_MAX_SIMPLIFIED_POINTS)
      .map(coordinate => ({
        lat: coordinate.lat,
        lng: coordinate.lng,
        // 고도는 있을 때만 싣는다 — Firestore에 `undefined`를 쓸 수 없고,
        // 고도 그래프는 키의 유무로 "고도 없음"을 읽는다(GRP-8, DM-29 `simplified`).
        ...(coordinate.ele !== undefined && Number.isFinite(coordinate.ele)
          ? { ele: coordinate.ele }
          : {}),
      }));

    await runTransaction(this.getStore(), async transaction => {
      const snapshot = await transaction.get(this.groupRef(groupId));

      if (!snapshot.exists()) {
        throw new GroupError(GroupValidationError.GroupNotFound);
      }

      const group = this.toGroupData(snapshot.id, snapshot.data());

      this.assertMember(group, userId);

      if (group.routeCount >= GROUP_MAX_ROUTE_COUNT) {
        throw new GroupError(GroupValidationError.RouteLimitExceeded);
      }

      const routeData: Record<string, unknown> = {
        name,
        storagePath: input.storagePath,
        // 규칙이 정수를 요구한다(`fileSize is int` · `pointCount is int`).
        fileSize: Math.round(input.fileSize),
        distance: input.distance,
        pointCount: Math.round(input.pointCount),
        bounds: { ...input.bounds },
        simplified,
        authorId: userId,
        authorName,
        createdAt: serverTimestamp(),
      };

      if (input.elevationGain !== undefined) {
        routeData.elevationGain = input.elevationGain;
      }

      // 하강 합(GRP-8 뒤집기). 고도 없는 GPX엔 키를 넣지 않는다 — 규칙도 옵셔널로 받는다(DM-29).
      if (input.elevationLoss !== undefined) {
        routeData.elevationLoss = input.elevationLoss;
      }

      transaction.set(this.routeRef(groupId, input.routeId), routeData);
      transaction.update(this.groupRef(groupId), {
        routeCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    });

    return input.routeId;
  }

  /**
   * 코스 삭제 (GRP-8). Firestore 문서만 지운다 —
   * Storage 원본 삭제는 호출자(T7의 업로더)가 `storagePath`로 함께 수행한다.
   */
  public async deleteRoute(groupId: string, routeId: string): Promise<void> {
    const userId = this.requireUserId();

    await runTransaction(this.getStore(), async transaction => {
      const [groupSnapshot, routeSnapshot] = await Promise.all([
        transaction.get(this.groupRef(groupId)),
        transaction.get(this.routeRef(groupId, routeId)),
      ]);

      if (!groupSnapshot.exists()) {
        throw new GroupError(GroupValidationError.GroupNotFound);
      }

      if (!routeSnapshot.exists()) {
        throw new GroupError(GroupValidationError.RouteNotFound);
      }

      const groupData = this.toGroupData(
        groupSnapshot.id,
        groupSnapshot.data()
      );
      const route = GroupRoute.from(
        this.toRouteData(routeSnapshot.id, routeSnapshot.data()),
        this.routeDirections
      );

      this.assertMember(groupData, userId);

      if (!route.canEdit(userId, Group.from(groupData))) {
        throw new GroupError(GroupValidationError.NotAuthor);
      }

      transaction.delete(this.routeRef(groupId, routeId));
      transaction.update(this.groupRef(groupId), {
        routeCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    });
  }

  /**
   * 만들어 둔 스냅샷 내용을 한 그룹에 쓴다(배낭 문서·역인덱스와 한 배치로).
   * 내용 생성과 분리해 둔 덕분에 여러 그룹에 같은 내용을 쓸 때 만들기를 한 번만 한다.
   */
  private async writeSnapshot(
    groupId: string,
    userId: string,
    content: GroupBagSnapshotContent
  ): Promise<void> {
    const batch = writeBatch(this.getStore());

    batch.set(this.bagRef(groupId, userId), {
      ...content,
      syncedAt: serverTimestamp(),
    });
    batch.update(this.memberRef(groupId, userId), { bagId: content.bagId });
    // 역인덱스에 bagId를 함께 둔다 — 배낭이 바뀌었을 때 그룹 문서를 N번 읽지 않고
    // 다시 쓸 그룹을 찾기 위해서다(GRP-5 갱신 시점 ①②, DM-29 역인덱스 표).
    batch.set(
      this.indexRef(userId, groupId),
      { hasBag: true, bagId: content.bagId },
      { merge: true }
    );

    await batch.commit();
  }

  /**
   * 그룹에 쓸 공개 스냅샷 내용을 만든다.
   *
   * 배낭이 사라졌거나 내 배낭 목록에서 빠진 경우에만 `BagNotFound`다 — 통신 실패·권한 거부·내부 오류는
   * 그대로 올린다. 이 코드를 보고 `syncMyBagSnapshot`이 연결을 해제하므로, 넓게 잡으면 일시적인
   * 통신 실패 한 번에 사용자의 배낭 연결이 풀린다(GRP-5).
   * 알럿을 띄우지 않는 조회 경로를 쓰는 이유도 같다 — 조용한 배경 동기화에 모달이 뜨면 안 된다.
   */
  private async buildSnapshotContent(bagId: string) {
    const owned = await this.bagStore.getOwnedBagWithGears(bagId);

    if (!owned) {
      throw new GroupError(GroupValidationError.BagNotFound);
    }

    return GroupBagSnapshotBuilder.build(bagId, owned.bag, owned.gears);
  }

  // 한 사용자가 동시에 속할 수 있는 그룹은 20개까지다(GRP-2).
  // 상한을 세려고 역인덱스 20문서를 전부 읽지 않는다 — 집계 쿼리 1회로 끝낸다.
  private async assertGroupQuota(userId: string) {
    const snapshot = await getCountFromServer(
      collection(this.getStore(), 'users', userId, 'groups')
    );

    if (snapshot.data().count >= GROUP_MAX_PER_USER) {
      throw new GroupError(GroupValidationError.GroupLimitExceeded);
    }
  }

  // linkBag·unlinkBag은 그룹 문서를 보지 않으면 비멤버 호출이 원시 Firestore 권한 오류로 새어 나간다.
  private async assertMembership(groupId: string, userId: string) {
    const snapshot = await getDoc(this.groupRef(groupId));

    if (!snapshot.exists()) {
      throw new GroupError(GroupValidationError.GroupNotFound);
    }

    this.assertMember(this.toGroupData(snapshot.id, snapshot.data()), userId);
  }

  private assertMember(group: GroupData, userId: string) {
    if (!group.memberIds.includes(userId)) {
      throw new GroupError(GroupValidationError.NotMember);
    }
  }

  private requireUserId() {
    const userId = this.firebase.getUserId();

    if (!userId) {
      throw new GroupError(GroupValidationError.NotLoggedIn);
    }

    return userId;
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private groupRef(groupId: string) {
    return doc(this.getStore(), 'groups', groupId);
  }

  private memberRef(groupId: string, uid: string) {
    return doc(this.getStore(), 'groups', groupId, 'members', uid);
  }

  private bagRef(groupId: string, uid: string) {
    return doc(this.getStore(), 'groups', groupId, 'bags', uid);
  }

  private pointRef(groupId: string, pointId: string) {
    return doc(this.getStore(), 'groups', groupId, 'points', pointId);
  }

  private routeRef(groupId: string, routeId: string) {
    return doc(this.getStore(), 'groups', groupId, 'routes', routeId);
  }

  private indexRef(uid: string, groupId: string) {
    return doc(this.getStore(), 'users', uid, 'groups', groupId);
  }

  private toIndexData(
    value: Omit<GroupIndexData, 'groupId' | 'joinedAt'>
  ): Record<string, unknown> {
    return {
      name: value.name,
      startDate: value.startDate,
      endDate: value.endDate,
      role: value.role,
      ownerId: value.ownerId,
      memberCount: value.memberCount,
      hasBag: value.hasBag,
      joinedAt: serverTimestamp(),
      ...(value.bagId ? { bagId: value.bagId } : {}),
      ...(value.campSpotId ? { campSpotId: value.campSpotId } : {}),
      ...(value.destinationName
        ? { destinationName: value.destinationName }
        : {}),
    };
  }

  private toGroupData(id: string, data: DocumentData): GroupData {
    return {
      id,
      name: data.name ?? '',
      startDate: data.startDate ?? '',
      endDate: data.endDate ?? '',
      ownerId: data.ownerId ?? '',
      memberIds: Array.isArray(data.memberIds) ? [...data.memberIds] : [],
      memberCount: Number(data.memberCount) || 0,
      ...(data.campSpotId ? { campSpotId: data.campSpotId as string } : {}),
      ...(data.destinationName
        ? { destinationName: data.destinationName as string }
        : {}),
      ...(data.meetingNote
        ? { meetingNote: data.meetingNote as string }
        : {}),
      inviteEnabled: data.inviteEnabled !== false,
      pointCount: Number(data.pointCount) || 0,
      routeCount: Number(data.routeCount) || 0,
      createdAt: toFirestoreDate(data.createdAt),
      updatedAt: toFirestoreDate(data.updatedAt),
    };
  }

  private toIndexDataFromDoc(id: string, data: DocumentData): GroupIndexData {
    return {
      groupId: id,
      name: data.name ?? '',
      startDate: data.startDate ?? '',
      endDate: data.endDate ?? '',
      role:
        data.role === GroupMemberRole.Owner
          ? GroupMemberRole.Owner
          : GroupMemberRole.Member,
      ownerId: data.ownerId ?? '',
      memberCount: Number(data.memberCount) || 0,
      ...(data.campSpotId ? { campSpotId: data.campSpotId as string } : {}),
      ...(data.destinationName
        ? { destinationName: data.destinationName as string }
        : {}),
      hasBag: data.hasBag === true,
      ...(data.bagId ? { bagId: data.bagId as string } : {}),
      joinedAt: toFirestoreDate(data.joinedAt),
    };
  }

  private toMemberData(id: string, data: DocumentData): GroupMemberData {
    return {
      uid: id,
      nickname: data.nickname ?? '',
      role:
        data.role === GroupMemberRole.Owner
          ? GroupMemberRole.Owner
          : GroupMemberRole.Member,
      ...(data.bagId ? { bagId: data.bagId as string } : {}),
      joinedAt: toFirestoreDate(data.joinedAt),
    };
  }

  // Firestore 문서의 좌표 한 점. 배열 원소는 어떤 모양으로도 올 수 있으므로 값마다 다시 본다.
  private toCoordinate(value: unknown): RouteCoordinate {
    const coordinate = this.isRecord(value) ? value : {};
    const elevation = Number(coordinate.ele);

    return {
      lat: Number(coordinate.lat) || 0,
      lng: Number(coordinate.lng) || 0,
      // 이 기능 이전에 올라간 코스에는 고도가 없다 — 그때는 키를 그대로 비워 둬야
      // 그래프가 "고도 없음"으로 읽고 자리를 비운다(GRP-8). 0으로 채우면 평지로 그려진다.
      ...(coordinate.ele === null ||
      coordinate.ele === undefined ||
      !Number.isFinite(elevation)
        ? {}
        : { ele: elevation }),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toPointData(id: string, data: DocumentData): GroupPointData {
    return {
      id,
      type: this.toPointType(data.type),
      latitude: Number(data.latitude) || 0,
      longitude: Number(data.longitude) || 0,
      title: data.title ?? '',
      ...(data.description
        ? { description: data.description as string }
        : {}),
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      createdAt: toFirestoreDate(data.createdAt),
      updatedAt: toFirestoreDate(data.updatedAt),
    };
  }

  private toPointType(value: unknown): GroupPointType {
    return this.isPointType(value) ? value : GroupPointType.Note;
  }

  private isPointType(value: unknown): value is GroupPointType {
    return Object.values(GroupPointType).some(type => type === value);
  }

  private toRouteData(id: string, data: DocumentData): GroupRouteData {
    const bounds = this.isRecord(data.bounds) ? data.bounds : {};
    const simplified: unknown[] = Array.isArray(data.simplified)
      ? data.simplified
      : [];

    return {
      id,
      name: data.name ?? '',
      storagePath: data.storagePath ?? '',
      fileSize: Number(data.fileSize) || 0,
      distance: Number(data.distance) || 0,
      ...(data.elevationGain !== undefined && data.elevationGain !== null
        ? { elevationGain: Number(data.elevationGain) || 0 }
        : {}),
      // 2026-09-23 이전 코스엔 없다 — 없으면 키를 비워 두고, 뒤집어 볼 때 축약 좌표로 잰다(GRP-8).
      ...(data.elevationLoss !== undefined && data.elevationLoss !== null
        ? { elevationLoss: Number(data.elevationLoss) || 0 }
        : {}),
      pointCount: Number(data.pointCount) || 0,
      bounds: {
        minLat: Number(bounds.minLat) || 0,
        maxLat: Number(bounds.maxLat) || 0,
        minLng: Number(bounds.minLng) || 0,
        maxLng: Number(bounds.maxLng) || 0,
      },
      simplified: simplified.map(coordinate => this.toCoordinate(coordinate)),
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      createdAt: toFirestoreDate(data.createdAt),
    };
  }
}

export default GroupStore;
