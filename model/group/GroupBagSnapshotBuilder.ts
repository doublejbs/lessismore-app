import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';
import CommunityBagSnapshotBuilder from '@/model/community/CommunityBagSnapshotBuilder';
import {
  GroupBagSnapshot,
  GroupBagSnapshotContent,
  toGroupDate,
} from './GroupData';

/**
 * 그룹 배낭 공개 스냅샷 빌더 (GRP-5, DM-29 `groups/{groupId}/bags/{uid}`).
 *
 * 제외 목록(메모·정확한 좌표·이동 경로·건강 기록·개인 장비 imageUrl·사용자 정의 장비 문서 ID)을
 * 여기서 새로 쓰지 않는다. CommunityBagSnapshotBuilder가 만든 결과에서 파생해 그룹 전용 필드만
 * 더한다 — 제외 규칙이 두 곳으로 갈라지면 한쪽만 고쳐질 위험이 있다(DM-29 명시).
 *
 * 커뮤니티 결과에서 `campSpotId`·`weather`는 옮기지 않는다. DM-29의 그룹 스냅샷 필드 표에 없고,
 * 여행지 정보는 그룹 문서가 이미 들고 있다(GRP-7).
 */
class GroupBagSnapshotBuilder {
  public static build(
    bagId: string,
    bag: BagItem,
    gears: Gear[]
  ): GroupBagSnapshotContent {
    return new GroupBagSnapshotBuilder().build(bagId, bag, gears);
  }

  public static fromFirestore(
    uid: string,
    value: unknown
  ): GroupBagSnapshot | null {
    return new GroupBagSnapshotBuilder().fromFirestore(uid, value);
  }

  public build(
    bagId: string,
    bag: BagItem,
    gears: Gear[]
  ): GroupBagSnapshotContent {
    const base = CommunityBagSnapshotBuilder.build(bag, gears);
    const snapshot: GroupBagSnapshotContent = {
      bagId,
      name: base.name,
      totalWeight: base.totalWeight,
      itemCount: base.itemCount,
      gears: base.gears.map(gear => ({ ...gear })),
    };

    if (base.startDate) {
      snapshot.startDate = base.startDate;
    }

    if (base.endDate) {
      snapshot.endDate = base.endDate;
    }

    if (base.destinationName) {
      snapshot.destinationName = base.destinationName;
    }

    return snapshot;
  }

  public fromFirestore(uid: string, value: unknown): GroupBagSnapshot | null {
    const base = CommunityBagSnapshotBuilder.fromFirestore(value);

    if (!base) {
      return null;
    }

    const data = value as { bagId?: unknown; syncedAt?: unknown };

    if (typeof data.bagId !== 'string') {
      return null;
    }

    const snapshot: GroupBagSnapshot = {
      uid,
      bagId: data.bagId,
      name: base.name,
      totalWeight: Number(base.totalWeight) || 0,
      itemCount: Number(base.itemCount) || 0,
      gears: base.gears.map(gear => ({ ...gear })),
      syncedAt: toGroupDate(data.syncedAt),
    };

    if (base.startDate) {
      snapshot.startDate = base.startDate;
    }

    if (base.endDate) {
      snapshot.endDate = base.endDate;
    }

    if (base.destinationName) {
      snapshot.destinationName = base.destinationName;
    }

    return snapshot;
  }
}

export default GroupBagSnapshotBuilder;
