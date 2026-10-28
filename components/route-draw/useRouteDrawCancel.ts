import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import app from '@/model/app/App';
import RouteDraw from '@/model/route-draw/RouteDraw';

/**
 * 그리기 모드 나가기 (RD-2) — 배낭 코스 화면과 그룹 지도가 함께 쓴다.
 *
 * 점이 2개 이상이면 확인 알럿(`버리기` destructive) 뒤에 나가고, 1개 이하면 바로 나간다. 수정(RD-7)은 바뀐 것이
 * 있을 때만 `수정한 내용을 버릴까요?`를 묻는다.
 * **Android 뒤로가기도 같다** — 모드 중에는 화면을 떠나지 않고 이 흐름을 탄다(모드 밖이면 화면이 받는다).
 * 저장 중에는 나가지 않는다(결과가 모드를 정한다).
 */
const useRouteDrawCancel = (routeDraw: RouteDraw, isActive: boolean) => {
  const handleCancel = useCallback(() => {
    if (routeDraw.isSaving()) {
      return;
    }

    if (!routeDraw.needsDiscardConfirm()) {
      routeDraw.cancel();

      return;
    }

    const l10n = app.getL10n();

    app.getAlertManager()?.show({
      // 수정이면 원래 코스가 그대로 남는다는 뜻으로 묻는다(RD-7).
      message: l10n.t(
        routeDraw.isEditing()
          ? 'routeDraw.discardEditConfirm'
          : 'routeDraw.discardConfirm'
      ),
      confirmText: l10n.t('routeDraw.discard'),
      cancelText: l10n.t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        routeDraw.cancel();
      },
    });
  }, [routeDraw]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleCancel();

        return true;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [handleCancel, isActive]);

  return handleCancel;
};

export default useRouteDrawCancel;
