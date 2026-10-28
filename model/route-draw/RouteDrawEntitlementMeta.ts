import app from '@/model/app/App';

/**
 * `지도에서 그리기` 옆에 적는 권한 한 줄의 l10n 키 (RD-8 · RD-9 #1) — `코스 추가` 메뉴와 빈 상태 카드가 같은 판단을 쓴다.
 * 무료 1회가 남았으면 `첫 코스는 무료예요`, 썼으면 `useless 플러스`. 플러스이거나 아직 기록을 못 읽었으면 `null`
 * (권한을 말할 것이 없다 — 못 읽은 상태는 누를 때 안내한다). observer 렌더 안에서 불러야 권한 변화를 따라간다.
 */
export const getRouteDrawEntitlementMetaKey = (): string | null => {
  const entitlement = app.getRouteDrawEntitlement();

  if (!entitlement || entitlement.isPlus() || !entitlement.isLoaded()) {
    return null;
  }

  return entitlement.hasUsedFree()
    ? 'routeDraw.menuDrawMetaPlus'
    : 'routeDraw.menuDrawMetaFree';
};
