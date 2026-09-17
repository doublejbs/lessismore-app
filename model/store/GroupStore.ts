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
import Firebase from '../firebase/Firebase';
import BagStore from './BagStore';
import Group from '../group/Group';
import GroupBagSnapshotBuilder from '../group/GroupBagSnapshotBuilder';
import {
  GroupBagSnapshot,
  GroupCreateInput,
  GroupData,
  GroupIndexData,
  GroupMemberData,
  GroupPatch,
  GroupPointData,
  GroupPointInput,
  GroupPointPatch,
  GroupRouteData,
  GroupRouteInput,
  toGroupDate,
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
import GroupValidationError from '../group/GroupValidationError';
import GroupValidator from '../group/GroupValidator';

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
    private readonly bagStore: BagStore
  ) {}

  public createGroupId() {
    return doc(collection(this.getStore(), 'groups')).id;
  }

  public createPointId(groupId: string) {
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
      updates.campSpotId = patch.campSpotId ?? deleteField();
      indexUpdates.campSpotId = patch.campSpotId ?? deleteField();
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
   */
  public async leaveGroup(groupId: string): Promise<void> {
    const userId = this.requireUserId();
    const snapshot = await getDoc(this.groupRef(groupId));

    if (!snapshot.exists()) {
      throw new GroupError(GroupValidationError.GroupNotFound);
    }

    const group = this.toGroupData(snapshot.id, snapshot.data());

    if (group.ownerId === userId) {
      throw new GroupError(GroupValidationError.OwnerCannotLeave);
    }

    if (!group.memberIds.includes(userId)) {
      throw new GroupError(GroupValidationError.NotMember);
    }

    const batch = writeBatch(this.getStore());

    batch.update(this.groupRef(groupId), {
      memberIds: arrayRemove(userId),
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    batch.delete(this.memberRef(groupId, userId));
    batch.delete(this.bagRef(groupId, userId));
    batch.delete(this.indexRef(userId, groupId));

    await batch.commit();
  }

  /**
   * 멤버 내보내기 (GRP-4). 방장만 가능하다.
   * 대상의 역인덱스(`users/{uid}/groups/{groupId}`)는 남의 문서라 클라이언트가 지우지 못한다 —
   * `memberIds` 변경을 보는 서버 트리거가 정리한다(DM-29 서버 작업).
   */
  public async removeMember(groupId: string, uid: string): Promise<void> {
    const userId = this.requireUserId();
    const snapshot = await getDoc(this.groupRef(groupId));

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

    if (!group.memberIds.includes(uid)) {
      throw new GroupError(GroupValidationError.NotMember);
    }

    const batch = writeBatch(this.getStore());

    batch.update(this.groupRef(groupId), {
      memberIds: arrayRemove(uid),
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    batch.delete(this.memberRef(groupId, uid));
    batch.delete(this.bagRef(groupId, uid));

    await batch.commit();
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
    const batch = writeBatch(this.getStore());

    batch.set(this.bagRef(groupId, userId), {
      ...content,
      gears: content.gears.map(gear => ({ ...gear })),
      syncedAt: serverTimestamp(),
    });
    batch.update(this.memberRef(groupId, userId), { bagId });
    // 역인덱스에 bagId를 함께 둔다 — 배낭이 바뀌었을 때 그룹 문서를 N번 읽지 않고
    // 다시 쓸 그룹을 찾기 위해서다(GRP-5 갱신 시점 ①②, DM-29 역인덱스 표).
    batch.set(
      this.indexRef(userId, groupId),
      { hasBag: true, bagId },
      { merge: true }
    );

    await batch.commit();
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
   * 사용자 조작 뒤에 따라붙는 배경 동기화라 한 그룹이 실패해도 나머지를 계속 쓰고 편집 흐름을 깨지 않는다.
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

    await Promise.all(
      snapshot.docs.map(async item => {
        try {
          await this.linkBag(item.id, bagId);
        } catch (error) {
          // 내보내진 그룹의 역인덱스가 아직 남아 있는 경우 등. 나머지 그룹 갱신을 막지 않는다.
          console.warn('[GroupStore] bag snapshot sync failed', item.id, error);
        }
      })
    );
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

    const [group, snapshot] = await Promise.all([
      this.getGroup(groupId),
      getDoc(this.pointRef(groupId, pointId)),
    ]);

    if (!group) {
      throw new GroupError(GroupValidationError.GroupNotFound);
    }

    if (!snapshot.exists()) {
      throw new GroupError(GroupValidationError.PointNotFound);
    }

    const point = GroupPoint.from(
      this.toPointData(snapshot.id, snapshot.data())
    );

    // 작성자도 방장도 아닐 때다 — 방장 전용 액션의 NotOwner와 구분한다(GRP-4).
    if (!point.canEdit(userId, group)) {
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

      const group = Group.from(
        this.toGroupData(groupSnapshot.id, groupSnapshot.data())
      );
      const point = GroupPoint.from(
        this.toPointData(pointSnapshot.id, pointSnapshot.data())
      );

      if (!point.canEdit(userId, group)) {
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
      GroupRoute.from(this.toRouteData(item.id, item.data()))
    );
  }

  /**
   * 코스 등록 (GRP-8). GPX 파싱과 Storage 업로드는 호출자가 끝낸 뒤 요약만 넘긴다 —
   * 이 스토어는 Firestore 문서만 쓴다.
   */
  public async createRoute(
    groupId: string,
    input: GroupRouteInput
  ): Promise<string> {
    const userId = this.requireUserId();

    // 보안 규칙 isValidRoutePayload 와 같은 조건으로 미리 거른다 — 업로드는 이미 끝난 뒤라
    // 여기서 거부되면 회수 경로 없는 고아 GPX가 남는다(GRP-8). 업로더도 업로드 전에 같은 것을 부른다.
    GroupValidator.validateRoute(input);

    const authorName = this.firebase.getNickname();
    const name = GroupValidator.toRouteName(input.name);
    // 축약 좌표는 파서가 500점 이하로 줄여 넘기지만, 1MB 문서 한도를 지키는 마지막 방어선을 둔다.
    const simplified = input.simplified
      .slice(0, GROUP_ROUTE_MAX_SIMPLIFIED_POINTS)
      .map(coordinate => ({ lat: coordinate.lat, lng: coordinate.lng }));

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

      const group = Group.from(
        this.toGroupData(groupSnapshot.id, groupSnapshot.data())
      );
      const route = GroupRoute.from(
        this.toRouteData(routeSnapshot.id, routeSnapshot.data())
      );

      if (!route.canEdit(userId, group)) {
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
      createdAt: toGroupDate(data.createdAt),
      updatedAt: toGroupDate(data.updatedAt),
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
      joinedAt: toGroupDate(data.joinedAt),
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
      joinedAt: toGroupDate(data.joinedAt),
    };
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
      createdAt: toGroupDate(data.createdAt),
      updatedAt: toGroupDate(data.updatedAt),
    };
  }

  private toPointType(value: unknown): GroupPointType {
    const types = Object.values(GroupPointType);

    return types.includes(value as GroupPointType)
      ? (value as GroupPointType)
      : GroupPointType.Note;
  }

  private toRouteData(id: string, data: DocumentData): GroupRouteData {
    const bounds = (data.bounds ?? {}) as Record<string, unknown>;
    const simplified = Array.isArray(data.simplified) ? data.simplified : [];

    return {
      id,
      name: data.name ?? '',
      storagePath: data.storagePath ?? '',
      fileSize: Number(data.fileSize) || 0,
      distance: Number(data.distance) || 0,
      ...(data.elevationGain !== undefined && data.elevationGain !== null
        ? { elevationGain: Number(data.elevationGain) || 0 }
        : {}),
      pointCount: Number(data.pointCount) || 0,
      bounds: {
        minLat: Number(bounds.minLat) || 0,
        maxLat: Number(bounds.maxLat) || 0,
        minLng: Number(bounds.minLng) || 0,
        maxLng: Number(bounds.maxLng) || 0,
      },
      simplified: simplified.map((coordinate: Record<string, unknown>) => ({
        lat: Number(coordinate?.lat) || 0,
        lng: Number(coordinate?.lng) || 0,
      })),
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      createdAt: toGroupDate(data.createdAt),
    };
  }
}

export default GroupStore;
