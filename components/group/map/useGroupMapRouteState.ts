import { useCallback, useState } from 'react';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import GroupMap from '@/model/group-map/GroupMap';

/**
 * 그룹 지도의 코스 고르기·관리 상태 (GRP-8 · GRP-10).
 *
 * 행 선택(카메라 이동 요청), `⋯` 삭제(확인 알럿), `코스 추가`(GPX 업로드)를 한곳에 모은다.
 * 업로드·삭제 자체는 `GroupRouteList`가 맡고 여기서는 흐름만 잇는다. 코스 목록은 지도 위 바텀 시트
 * 안에 있어(모달이 아니다) 삭제 확인을 바로 띄운다.
 */
const useGroupMapRouteState = (groupMap: GroupMap) => {
  const l10n = app.getL10n();
  const routeList = groupMap.getRouteList();
  // `코스 추가`로 시작한 작업인지. 목록의 `submitting`은 삭제에도 켜져 `올리는 중`과 갈라 읽는다.
  const [isAddingRoute, setIsAddingRoute] = useState(false);

  // 행 탭 — 그 코스를 고르고 카메라를 옮긴다(이미 고른 코스여도 옮긴다, GRP-8).
  const handleSelectRoute = useCallback(
    (route: GroupRoute) => {
      groupMap.focusRoute(route.getId());
    },
    [groupMap]
  );

  // `⋯` → 삭제. 시트가 모달이 아니므로 곧바로 확인을 묻는다(웹 목록도 같다).
  const handleDeleteRoute = useCallback(
    (route: GroupRoute) => {
      app.getAlertManager()?.show({
        // 지우는 대상과 함께 사라지는 것(Storage 원본)을 문구에 담는다 — 되돌릴 수 없다.
        message: l10n.t('route.deleteConfirm', { name: route.getName() }),
        confirmText: l10n.t('route.delete'),
        cancelText: l10n.t('common.cancel'),
        destructive: true,
        onConfirm: async () => {
          await routeList.deleteRoute(route);
        },
      });
    },
    [l10n, routeList]
  );

  /**
   * `코스 추가` — 파일 선택 → 파싱 → 업로드(GRP-8 규칙 그대로, `GroupRouteList.addRoute`).
   * 실패 사유는 목록 모델이 토스트로 알린다. 올린 코스를 골라 카메라를 옮긴다 — 방금 올린 것이
   * 지도·그래프·시트 목록에 곧바로 보인다.
   */
  const handleAddRoute = useCallback(async () => {
    setIsAddingRoute(true);

    try {
      const routeId = await routeList.addRoute();

      if (routeId) {
        groupMap.focusRoute(routeId);
      }
    } finally {
      setIsAddingRoute(false);
    }
  }, [groupMap, routeList]);

  return {
    isAddingRoute,
    isUploadingRoute: isAddingRoute && routeList.isSubmitting(),
    handleSelectRoute,
    handleDeleteRoute,
    handleAddRoute,
  };
};

export default useGroupMapRouteState;
