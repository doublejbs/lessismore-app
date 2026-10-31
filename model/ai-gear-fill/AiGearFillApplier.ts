import app from '../app/App';
import Gear from '../gear/Gear';
import BagStore from '../store/BagStore';
import GearStore from '../store/GearStore';
import AiGearFillItem from './AiGearFillItem';

export interface AiGearFillApplyOutcome {
  // 배낭에 담긴(이미 담겨 있던 것 포함) 개수
  added: number;
  // 창고에서 찾지 못해(추천 뒤 지운 경우) 담지 못한 개수
  failed: number;
}

/**
 * 체크한 추천 장비를 배낭에 담는다(AS-5·AS-15). **기존 스토어 경로만** 쓴다 — 첫 여행 가이드(OB-7)와 같다.
 *
 * 1. 배낭과 담긴 장비를 읽어 이미 담긴 장비를 거른다(AS-5 "와도 앱이 한 번 더 걸러").
 * 2. 추천은 전부 창고 장비라 `getUserGear`로 읽는다. 없으면(추천 뒤 창고에서 지움) 건너뛰고 실패로 센다.
 *    카탈로그 등록 경로는 2026-10-31부터 쓰지 않는다.
 * 3. `BagStore.save(bagId, 추가분, [], 전체)` **한 번** — 네 번째 인자는 배낭 무게 계산용
 *    전체 목록이라 기존에 담긴 장비를 포함한다(`BagEdit.save`와 같은 규칙).
 *
 * 저장(3)이 실패하면 예외를 그대로 던진다 — 시트가 닫히지 않고 다시 시도할 수 있어야 한다(AS-15).
 */
class AiGearFillApplier {
  public static new(bagStore: BagStore, gearStore: GearStore) {
    return new AiGearFillApplier(bagStore, gearStore);
  }

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore
  ) {}

  public async apply(
    bagId: string,
    items: AiGearFillItem[]
  ): Promise<AiGearFillApplyOutcome> {
    const { bagStore, gearStore } = this;

    const owned = await bagStore.getOwnedBagWithGears(bagId);

    if (!owned) {
      throw new Error('bag not found');
    }

    const existingIds = new Set(owned.gears.map(gear => gear.getId()));
    const targets = items.filter(item => !existingIds.has(item.getGearId()));
    const alreadyAdded = items.length - targets.length;

    const foundGears = await Promise.all(
      targets.map(item => gearStore.getUserGear(item.getGearId()))
    );
    const gears = foundGears.filter(
      (gear): gear is Gear => gear !== null && gear !== undefined
    );
    const failed = targets.length - gears.length;

    if (gears.length > 0) {
      await bagStore.save(bagId, gears, [], [...owned.gears, ...gears]);
      // 이 배낭을 연결한 그룹의 공개 스냅샷을 다시 쓴다(GRP-5) — 배낭 편집 확인과 같은 기존 경로.
      app.getGroupStore()?.syncBagSnapshotsInBackground(bagId);
    }

    return { added: gears.length + alreadyAdded, failed };
  }
}

export default AiGearFillApplier;
