import { RouteRowAction } from '@/components/route/RouteListView';
import app from '@/model/app/App';
import { RouteDisplay } from '@/model/route/RouteDisplay';

/**
 * 코스 행 메타의 앞부분 (GRP-8, BD-11) — 그룹 코스 목록과 배낭 코스 목록이 같은 조각을 쓴다.
 *
 * `거리 · 상승 · 역방향` 순이다. 숫자를 맨 앞에 두고(HM-8), 뒤집힌 코스는 배지가 아니라 **메타
 * 줄 조각**으로 알린다 — 면 없이 헤어라인으로 가르는 목록에서 배지는 유일한 예외 면이 된다.
 * 상승은 지금 보는 방향의 값이다(뒤집혔으면 원래의 하강). 거리는 방향과 무관하다.
 * 출처(올린 사람·그룹 이름)는 호출자가 뒤에 붙인다.
 */
export const getRouteMetaParts = (route: RouteDisplay): string[] => {
  const l10n = app.getL10n();
  const elevationGain = route.getElevationGain();

  return [
    route.getDistanceText(),
    ...(elevationGain === undefined
      ? []
      : [l10n.t('route.elevation', { value: Math.round(elevationGain) })]),
    ...(route.isReversed() ? [l10n.t('route.reversed')] : []),
  ];
};

/**
 * `⋯` 메뉴의 방향 뒤집기 항목 (GRP-8). **권한과 무관하게 모든 행에 둔다** — 뒤집기는 보는
 * 사람의 화면 설정이라 남이 올린 코스나 연결 그룹에서 온 코스도 누구나 뒤집어 본다.
 * 문구는 현재 방향을 말한다: 원래 방향이면 `방향 뒤집기`, 뒤집혀 있으면 `원래 방향으로 보기`.
 */
export const createRouteDirectionAction = (
  route: RouteDisplay
): RouteRowAction => {
  const l10n = app.getL10n();

  return {
    icon: 'swap-vertical-outline',
    label: l10n.t(
      route.isReversed() ? 'route.restoreDirection' : 'route.reverse'
    ),
    onPress: () => route.toggleReversed(),
  };
};
