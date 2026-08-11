import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';

/**
 * HM-7 내 기록의 계산부. 전부 순수 함수다.
 *
 * 홈은 새 쿼리를 만들지 않는다 — `Home`이 이미 읽어 둔 장비·배낭 배열에서 파생한다.
 */

export interface HomeRecordSummary {
  gearCount: number;
  /**
   * 창고 전체 무게 합의 **저장 단위(g)**. 표시 서식은 뷰가 `formatBagWeight()`로 만든다
   * (DM-26) — 여기서 kg로 미리 반올림하면 같은 합이 화면마다 다른 자리수로 갈린다.
   */
  totalWeightGram: number;
  bagCount: number;
  unusedCount: number;
}

/**
 * 사용률 0% 판정. 창고 필터(WH-2-1)와 **같은 기준**이어야 한다 — 홈에서 센 수와
 * 창고에서 걸러진 수가 다르면 숫자를 눌러 들어간 사용자가 혼란스럽다.
 *
 * 담긴 적이 아예 없는 장비는 제외한다(쓸 기회가 없었던 것과 담아 가고도 안 쓴 것은 다르다).
 */
export const isUnusedGear = (gear: Gear): boolean =>
  gear.hasUsedRate() && gear.getUsedRate() === 0;

export const getHomeRecordSummary = (
  gears: Gear[],
  bags: BagItem[]
): HomeRecordSummary => {
  const totalWeightGram = gears.reduce(
    (sum, gear) => sum + (Number(gear.getWeight()) || 0),
    0
  );

  return {
    gearCount: gears.length,
    totalWeightGram,
    bagCount: bags.length,
    unusedCount: gears.filter(isUnusedGear).length,
  };
};
