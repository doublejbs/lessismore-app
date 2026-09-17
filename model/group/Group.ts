import { makeAutoObservable } from 'mobx';
import { getGroupInviteUrl } from '@/constants/WebLinks';
import { GroupData, GroupIndexData, toGroupDate } from './GroupData';
import GroupMemberRole from './GroupMemberRole';
import { GROUP_MAX_MEMBER_COUNT } from './GroupLimits';

// 그룹 = 여행 1건 (GRP-2, DM-29 `groups/{groupId}`).
class Group {
  private readonly id: string;
  private readonly name: string;
  private readonly startDate: string;
  private readonly endDate: string;
  private readonly ownerId: string;
  private readonly memberIds: string[];
  private readonly memberCount: number;
  private readonly campSpotId: string | undefined;
  private readonly destinationName: string | undefined;
  private readonly meetingNote: string | undefined;
  private readonly inviteEnabled: boolean;
  private readonly pointCount: number;
  private readonly routeCount: number;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;
  private readonly summary: boolean;
  private readonly myBagLinked: boolean;

  public static from(data: GroupData) {
    return new Group(data);
  }

  // 역인덱스(users/{uid}/groups)만으로 만든 목록용 요약본(GRP-1).
  // 그룹 문서를 읽지 않으므로 memberIds에는 조회자 본인만 들어 있고 포인트·코스 수는 0이다.
  public static fromIndex(data: GroupIndexData, viewerId: string) {
    return new Group({
      id: data.groupId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      ownerId: data.ownerId,
      memberIds: [viewerId],
      memberCount: data.memberCount,
      ...(data.campSpotId ? { campSpotId: data.campSpotId } : {}),
      ...(data.destinationName
        ? { destinationName: data.destinationName }
        : {}),
      inviteEnabled: true,
      pointCount: 0,
      routeCount: 0,
      createdAt: data.joinedAt,
      updatedAt: data.joinedAt,
      summary: true,
      hasMyBag: data.hasBag,
    });
  }

  public constructor(data: GroupData) {
    this.id = data.id;
    this.name = data.name;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.ownerId = data.ownerId;
    this.memberIds = [...data.memberIds];
    this.memberCount = data.memberCount;
    this.campSpotId = data.campSpotId;
    this.destinationName = data.destinationName;
    this.meetingNote = data.meetingNote;
    this.inviteEnabled = data.inviteEnabled;
    this.pointCount = data.pointCount;
    this.routeCount = data.routeCount;
    this.createdAt = toGroupDate(data.createdAt);
    this.updatedAt = toGroupDate(data.updatedAt);
    this.summary = data.summary === true;
    this.myBagLinked = data.hasMyBag === true;

    makeAutoObservable(this);
  }

  public getId() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getStartDate() {
    return this.startDate;
  }

  public getEndDate() {
    return this.endDate;
  }

  public getOwnerId() {
    return this.ownerId;
  }

  public getMemberIds() {
    return this.memberIds;
  }

  public getMemberCount() {
    return this.memberCount;
  }

  public getCampSpotId() {
    return this.campSpotId;
  }

  public getDestinationName() {
    return this.destinationName;
  }

  public getMeetingNote() {
    return this.meetingNote;
  }

  public getInviteEnabled() {
    return this.inviteEnabled;
  }

  public getPointCount() {
    return this.pointCount;
  }

  public getRouteCount() {
    return this.routeCount;
  }

  public getCreatedAt() {
    return this.createdAt;
  }

  public getUpdatedAt() {
    return this.updatedAt;
  }

  public getRole(uid: string) {
    return this.isOwner(uid) ? GroupMemberRole.Owner : GroupMemberRole.Member;
  }

  public isOwner(uid: string) {
    return !!uid && this.ownerId === uid;
  }

  public isMember(uid: string) {
    return !!uid && this.memberIds.includes(uid);
  }

  public isFull() {
    return this.memberCount >= GROUP_MAX_MEMBER_COUNT;
  }

  // 종료일이 지난 그룹(GRP-1 `지난 그룹`). 종료일 당일은 지나지 않은 것으로 본다.
  public isPast(now: Date = new Date()) {
    return this.toDateKey(now) > this.endDate;
  }

  // 요약본은 memberIds·포인트·코스 수를 신뢰할 수 없다.
  public isSummary() {
    return this.summary;
  }

  // 역인덱스가 들고 있는 "내 배낭 연결 여부". 그룹 문서로 만든 인스턴스는 항상 false다.
  public hasMyBag() {
    return this.myBagLinked;
  }

  public getInviteUrl() {
    return getGroupInviteUrl(this.id);
  }

  private toDateKey(value: Date) {
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${value.getFullYear()}-${month}-${day}`;
  }
}

export default Group;
