import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import app from '@/model/app/App';

interface Props {
  visible: boolean;
  /**
   * `지도에서 그리기`를 보일지. 지도를 그릴 수 없는 환경(MapLibre가 없는 옛 바이너리 — MAP-1)에서는 가져오기만 남긴다.
   */
  canDraw: boolean;
  onClose: () => void;
  onImport: () => void;
  onDraw: () => void;
}

/**
 * `코스 추가` 메뉴 (RD-1) — 배낭 코스 화면(BD-11)과 그룹 지도(GRP-10)가 함께 쓴다.
 * `GPX 파일 가져오기`(지금 흐름 그대로) · `지도에서 그리기`. 항목의 `onPress`는 시트가 **다 내려간 뒤** 불린다
 * (`BottomMenuModalView` 닫힘 완료 관례) — 시트 위에 파일 선택기·그리기 모드가 겹치지 않는다.
 *
 * `지도에서 그리기` 메타는 권한(RD-8)을 말한다 — 무료 1회가 남았으면 `첫 코스는 무료예요`, 썼으면 `useless 플러스`.
 * 플러스이거나 아직 기록을 못 읽었으면 기본 설명 그대로다(못 읽은 상태는 누를 때 안내한다).
 */
const RouteAddMenuView: FC<Props> = ({
  visible,
  canDraw,
  onClose,
  onImport,
  onDraw,
}) => {
  const l10n = app.getL10n();
  const entitlement = app.getRouteDrawEntitlement();

  const getDrawMetaKey = () => {
    if (!entitlement || entitlement.isPlus() || !entitlement.isLoaded()) {
      return 'routeDraw.menuDrawMeta';
    }

    return entitlement.hasUsedFree()
      ? 'routeDraw.menuDrawMetaPlus'
      : 'routeDraw.menuDrawMetaFree';
  };

  return (
    <BottomMenuModalView
      visible={visible}
      onClose={onClose}
      title={l10n.t('routeDraw.menuTitle')}
      menuItems={[
        {
          icon: 'document-outline',
          text: l10n.t('routeDraw.menuImport'),
          subtitle: l10n.t('routeDraw.menuImportMeta'),
          onPress: onImport,
        },
        ...(canDraw
          ? [
              {
                icon: 'create-outline' as const,
                text: l10n.t('routeDraw.menuDraw'),
                subtitle: l10n.t(getDrawMetaKey()),
                onPress: onDraw,
              },
            ]
          : []),
      ]}
    />
  );
};

export default observer(RouteAddMenuView);
