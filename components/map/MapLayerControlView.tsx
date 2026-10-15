import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import MapControlButtonView from '@/components/map/MapControlButtonView';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import app from '@/model/app/App';
import MapLayer from '@/model/map/MapLayer';
import MapLayerScreen from '@/model/map/MapLayerScreen';

interface Props {
  // 측정 `click_map_layer`의 `screen`.
  screen: MapLayerScreen;
}

/**
 * 지도 종류 전환 (MAP-7) — 우측 지도 컨트롤 스택 맨 아래의 원형 버튼(`layers-outline`, `내 위치`와 같은 크기 —
 * 지도 위 요소라 그림자) + 작은 메뉴(`일반 지도` · `위성`). 키가 없는 빌드·웹이면 그리지 않는다.
 *
 * - `위성` 메타 한 줄: 확인 중 `확인 중…`(비활성) > 폴백 중 `잠시 쓸 수 없어요`(비활성) > 오프라인 `온라인에서 볼 수 있어요`(비활성) > 플러스 아님
 *   `useless 플러스`(자물쇠 아이콘 — 누르면 구독 화면, SUB-13). 지금 고른 항목은 체크 표시 + 메타 `사용 중`.
 * - 그리기·조준 모드에서도 둔다 — 위성 위에서 코스를 그리는 것이 핵심 사용처다.
 */
const MapLayerControlView: FC<Props> = ({ screen }) => {
  const l10n = app.getL10n();
  const store = app.getMapLayerStore();
  const [menuVisible, setMenuVisible] = useState(false);

  // 지도 화면이 나타날 때(그리고 확인이 필요해질 때 — 연결 복귀 등) 기억한 위성을 타일 한 장으로 확인한다.
  const needsVerification = store?.needsVerification() ?? false;

  useEffect(() => {
    if (needsVerification) {
      store?.verifyIfNeeded();
    }
  }, [needsVerification, store]);

  const handleOpenMenu = () => {
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
  };

  if (!store || !store.isAvailable()) {
    return null;
  }

  const layer = store.getLayer();
  const isPlus = store.isPlus();
  const isOffline = app.getNetworkStatus().isOffline();
  const isSatellite = layer === MapLayer.Satellite;

  const getSatelliteMeta = (): string | undefined => {
    if (store.isProbing()) {
      return l10n.t('map.layer.probingMeta');
    }

    if (store.isUnavailable()) {
      return l10n.t('map.layer.unavailableMeta');
    }

    if (isOffline) {
      return l10n.t('map.layer.offlineMeta');
    }

    if (!isPlus) {
      return l10n.t('map.layer.plusMeta');
    }

    return isSatellite ? l10n.t('map.layer.selectedMeta') : undefined;
  };

  const satelliteMeta = getSatelliteMeta();
  const satelliteDisabled =
    store.isUnavailable() || isOffline || store.isProbing();

  const menuItems = [
    {
      icon: 'map-outline' as const,
      text: l10n.t('map.layer.standard'),
      selected: !isSatellite,
      ...(!isSatellite ? { subtitle: l10n.t('map.layer.selectedMeta') } : {}),
      onPress: () => store.select(MapLayer.Standard, screen),
    },
    {
      icon: isPlus
        ? ('earth-outline' as const)
        : ('lock-closed-outline' as const),
      text: l10n.t('map.layer.satellite'),
      selected: isSatellite,
      disabled: satelliteDisabled,
      ...(satelliteMeta ? { subtitle: satelliteMeta } : {}),
      onPress: () => store.select(MapLayer.Satellite, screen),
    },
  ];

  return (
    <>
      <MapControlButtonView
        icon='layers-outline'
        accessibilityLabel={l10n.t('map.layer.button')}
        onPress={handleOpenMenu}
      />
      <BottomMenuModalView
        visible={menuVisible}
        onClose={handleCloseMenu}
        title={l10n.t('map.layer.title')}
        menuItems={menuItems}
      />
    </>
  );
};

export default observer(MapLayerControlView);
