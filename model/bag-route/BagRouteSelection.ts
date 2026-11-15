import LocalStorageManager from '@/model/storage/LocalStorageManager';

// 기기 저장 키 접두(BD-11 `bagRoute.selected.{bagId}`).
const STORAGE_KEY_PREFIX = 'bagRoute.selected.';
// 목록 키의 출처 접두 — `BagRouteList.getEntries()`의 키 규칙과 같다.
const BAG_ENTRY_PREFIX = 'bag:';
const GROUP_ENTRY_PREFIX = 'group:';

const getStorageKey = (bagId: string): string =>
  `${STORAGE_KEY_PREFIX}${bagId}`;

/**
 * 배낭 코스 화면의 **선택 기억** (BD-11, 2026-10-13). 사용자가 목록에서 고른 코스의 목록 키를 여행별로
 * 기기에 둔다 — 코스 화면(`BagRouteList`)과 페이월 히어로(SUB-2)가 같은 값을 읽는다.
 * 자동 선택(로드 후 첫 코스·추가 직후)은 저장하지 않는다.
 */
class BagRouteSelection {
  public static toBagEntryKey(routeId: string): string {
    return `${BAG_ENTRY_PREFIX}${routeId}`;
  }

  public static toGroupEntryKey(routeId: string): string {
    return `${GROUP_ENTRY_PREFIX}${routeId}`;
  }

  // 목록 키가 내 배낭 코스면 그 코스 id, 아니면 `null`.
  public static toBagRouteId(entryKey: string | null): string | null {
    if (!entryKey?.startsWith(BAG_ENTRY_PREFIX)) {
      return null;
    }

    return entryKey.slice(BAG_ENTRY_PREFIX.length) || null;
  }

  // 기억된 목록 키. 없거나 읽지 못하면 `null`.
  public static async load(bagId: string): Promise<string | null> {
    const value = await LocalStorageManager.get<unknown>(getStorageKey(bagId));

    return typeof value === 'string' && value ? value : null;
  }

  public static async save(bagId: string, entryKey: string): Promise<void> {
    await LocalStorageManager.set(getStorageKey(bagId), entryKey);
  }
}

export default BagRouteSelection;
