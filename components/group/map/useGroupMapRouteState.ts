import { useCallback, useEffect, useState } from 'react';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import GroupMap from '@/model/group-map/GroupMap';
import RouteDraw from '@/model/route-draw/RouteDraw';
import RouteDrawSource from '@/model/route-draw/RouteDrawSource';
import RouteDrawTargetKind from '@/model/route-draw/RouteDrawTargetKind';
import useRouteDrawCancel from '@/components/route-draw/useRouteDrawCancel';

/**
 * 그룹 지도의 코스 고르기·관리 상태 (GRP-8 · GRP-10 · RD-1).
 *
 * 행 선택(카메라 이동 요청), `⋯` 삭제(확인 알럿), `코스 추가` 메뉴(GPX 가져오기 | 지도에서 그리기)를 한곳에 모은다.
 * 업로드·삭제 자체는 `GroupRouteList`가, 그리기 편집·저장 흐름은 `RouteDraw`가 맡고 여기서는 흐름만 잇는다. 코스
 * 목록은 지도 위 바텀 시트 안에 있어(모달이 아니다) 삭제 확인을 바로 띄운다.
 */
const useGroupMapRouteState = (groupMap: GroupMap) => {
  const l10n = app.getL10n();
  const routeList = groupMap.getRouteList();
  // `코스 추가`로 시작한 작업인지. 목록의 `submitting`은 삭제에도 켜져 `올리는 중`과 갈라 읽는다.
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  // `코스 추가` 메뉴(RD-1).
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);
  /**
   * 코스 그리기(RD-2 · RD-3) — 화면 수명 동안 하나. 저장은 가져오기와 같은 목록 경로(`addDrawnRoute`)를 타고,
   * 올린 코스를 골라 카메라를 맞춘다(`focusRoute`). 기본 이름은 `{그룹 이름} 코스`.
   */
  const [routeDraw] = useState(() =>
    RouteDraw.from(RouteDrawSource.Group, {
      parent: {
        kind: RouteDrawTargetKind.Group,
        parentId: routeList.getGroupId(),
      },
      // 상한 등 저장 전 검사(RD-8) — 무료 1회 기록 전에 본다.
      canSubmit: () => routeList.getDrawSubmitBlockReason(),
      createRouteId: () => routeList.createRouteId(),
      submit: (draft, localUri, routeId) =>
        routeList.addDrawnRoute(draft, localUri, routeId),
      // 그린 코스 수정(RD-7) — 같은 문서·같은 Storage 경로를 덮어쓴다.
      update: (routeId, draft, localUri) =>
        routeList.updateDrawnRoute(routeId, draft, localUri),
      // 모드를 나간 뒤 올린 코스를 골라 카메라를 맞춘다(가져오기와 같다).
      onSaved: routeId => {
        groupMap.focusRoute(routeId);
      },
      resolveDefaultName: async () => {
        const name = groupMap.getGroup()?.getName();

        return name ? l10n.t('routeDraw.defaultName', { name }) : '';
      },
    })
  );

  // 화면을 떠나면 대기 중인 길 찾기를 끊는다 — 버린 구간의 토스트·측정이 다른 화면에 나가지 않게(RD-6).
  useEffect(() => () => routeDraw.dispose(), [routeDraw]);

  const isDrawing = routeDraw.isActive();
  const handleCancelDrawing = useRouteDrawCancel(routeDraw, isDrawing);

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
   * `GPX 파일 가져오기` — 파일 선택 → 파싱 → 업로드(GRP-8 규칙 그대로, `GroupRouteList.addRoute`).
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

  // 시트 푸터 `코스 추가` → 메뉴(RD-1). 상한이면 버튼이 이미 막혀 있다.
  const handleOpenAddMenu = useCallback(() => {
    setIsAddMenuVisible(true);
  }, []);

  const handleCloseAddMenu = useCallback(() => {
    setIsAddMenuVisible(false);
  }, []);

  // 메뉴 항목은 시트가 다 내려간 뒤 불린다(`BottomMenuModalView` 관례) — 파일 선택기·모드 전환이 시트와 겹치지 않는다.
  const handleImportRoute = useCallback(() => {
    void handleAddRoute();
  }, [handleAddRoute]);

  // 그리기 모드에 들어간다(RD-1). 조준 모드는 화면(`GroupMapView`)이 먼저 끈다. 무료 1회를 썼으면 구독 화면이 먼저 뜬다(RD-8).
  const handleStartDrawing = useCallback(() => {
    routeDraw.requestStart();
  }, [routeDraw]);

  // 코스 행 `⋯` → `코스 수정`(RD-7, 올린 사람의 그린 코스). 권한이 없으면 구독 화면이 먼저 뜬다(RD-8).
  const handleEditRoute = useCallback(
    (route: GroupRoute) => {
      routeDraw.requestEdit(route);
    },
    [routeDraw]
  );

  const handleSubmitDrawnRoute = useCallback(
    (name: string) => {
      void routeDraw.save(name);
    },
    [routeDraw]
  );

  return {
    isAddingRoute,
    isUploadingRoute: isAddingRoute && routeList.isSubmitting(),
    isAddMenuVisible,
    routeDraw,
    handleSelectRoute,
    handleDeleteRoute,
    handleEditRoute,
    handleAddRoute,
    handleOpenAddMenu,
    handleCloseAddMenu,
    handleImportRoute,
    handleStartDrawing,
    handleCancelDrawing,
    handleSubmitDrawnRoute,
  };
};

export default useGroupMapRouteState;
