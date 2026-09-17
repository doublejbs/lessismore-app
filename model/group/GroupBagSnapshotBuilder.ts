import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';
import CommunityBagSnapshotBuilder from '@/model/community/CommunityBagSnapshotBuilder';
import { CommunityBagSnapshotGear } from '@/model/community/CommunityData';
import {
  GROUP_BAG_SNAPSHOT_DESTINATION_NAME_MAX_LENGTH,
  GROUP_BAG_SNAPSHOT_MAX_GEAR_COUNT,
  GROUP_BAG_SNAPSHOT_NAME_MAX_LENGTH,
} from './GroupLimits';
import {
  GroupBagSnapshot,
  GroupBagSnapshotContent,
  GroupBagSnapshotGear,
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
 *
 * 장비는 스프레드로 통째 옮기지 않고 **필드를 하나씩 집어** 담는다. 타입스크립트는 스프레드로
 * 흘러든 초과 속성을 잡지 못해, 커뮤니티 빌더에 언젠가 `imageUrl` 같은 필드가 붙으면 그룹
 * 스냅샷으로 조용히 새어 들어간다 — 제외 목록은 개인정보 계약이라 유출 경로를 닫아 둔다.
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
      // 길이·개수 상한은 보안 규칙 isValidBagSnapshot 과 같은 값이다. 넘으면 거절이 아니라
      // 잘라 담는다 — 사용자가 고칠 수 없는 값 때문에 배낭 연결이 막히면 안 된다.
      name: this.toLimitedText(base.name, GROUP_BAG_SNAPSHOT_NAME_MAX_LENGTH),
      totalWeight: base.totalWeight,
      // itemCount 는 배낭의 실제 장비 수라 gears 를 자르더라도 함께 줄이지 않는다.
      itemCount: base.itemCount,
      gears: base.gears
        .slice(0, GROUP_BAG_SNAPSHOT_MAX_GEAR_COUNT)
        .map(gear => this.toSnapshotGear(gear)),
    };

    if (base.startDate) {
      snapshot.startDate = base.startDate;
    }

    if (base.endDate) {
      snapshot.endDate = base.endDate;
    }

    if (base.destinationName) {
      snapshot.destinationName = this.toLimitedText(
        base.destinationName,
        GROUP_BAG_SNAPSHOT_DESTINATION_NAME_MAX_LENGTH
      );
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
      totalWeight: base.totalWeight,
      itemCount: base.itemCount,
      gears: base.gears.map(gear => this.toSnapshotGear(gear)),
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

  private toLimitedText(value: string | undefined, maxLength: number) {
    return (value ?? '').slice(0, maxLength);
  }

  // 커스텀 장비는 문서 ID를 싣지 않으므로(DM-28·DM-29 제외 목록) gearId만 조건부로 넣는다.
  // 값은 커뮤니티 스냅샷이 확정한 타입 그대로 옮긴다 — 여기서 다시 보정하면
  // "커뮤니티 결과에서 파생한다"는 계약이 흐려지고, 실제 방어는 보안 규칙(isValidBagSnapshot)이 한다.
  private toSnapshotGear(gear: CommunityBagSnapshotGear): GroupBagSnapshotGear {
    return {
      ...(gear.gearId ? { gearId: gear.gearId } : {}),
      company: gear.company,
      name: gear.name,
      weight: gear.weight,
      category: gear.category,
    };
  }
}

export default GroupBagSnapshotBuilder;
