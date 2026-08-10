import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import OrderType from '@/model/order/OrderType';
import BagStore from '@/model/store/BagStore';
import GearStore from '@/model/store/GearStore';

/**
 * HM-7 내 기록 · AU-4 프로필 지표의 **조회부**.
 *
 * 홈과 정보 탭은 같은 두 목록(배낭 전체 · 장비 전체)에서 파생하므로 조회를 한곳에 둔다 —
 * 양쪽에 복제해 두면 필터·정렬 인자가 한쪽만 바뀌는 순간 두 화면의 수가 달라진다.
 * 세는 일은 `HomeRecordSummary`의 순수 함수가 맡는다(계산과 조회를 같은 파일에 섞지 않는다).
 */

export interface HomeRecordSources {
  bags: BagItem[];
  gears: Gear[];
}

/**
 * **두 조회를 병렬로 낸다** — 서로 의존이 없어 순차로 내면 첫 진입 대기가 두 배가 된다.
 * 한쪽이 실패해도 나머지 카드·지표는 그려야 하므로 개별로 감싸고 빈 배열로 떨어진다.
 */
export const loadHomeRecordSources = async (
  bagStore: BagStore,
  gearStore: GearStore
): Promise<HomeRecordSources> => {
  const [bags, gears] = await Promise.all([
    loadBags(bagStore),
    loadGears(gearStore),
  ]);

  return { bags, gears };
};

const loadBags = async (bagStore: BagStore): Promise<BagItem[]> => {
  try {
    return await bagStore.getList();
  } catch (e) {
    console.error('내 기록 배낭 조회 실패:', e);

    return [];
  }
};

const loadGears = async (gearStore: GearStore): Promise<Gear[]> => {
  try {
    // 카테고리 필터는 화면에서 클라이언트로 거르므로 전체를 한 번만 읽는다.
    return await gearStore.getList([GearFilter.All], OrderType.CreatedDesc);
  } catch (e) {
    console.error('내 기록 창고 조회 실패:', e);

    return [];
  }
};
