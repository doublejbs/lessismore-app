import { useCallback, useEffect, useState } from 'react';
import { ViewToken } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AdSlotList from '@/model/ads/AdSlotList';
import AdPlacement from '@/model/ads/AdPlacement';
import { AdListEntry } from '@/model/ads/AdListEntry';
import app from '@/model/app/App';

// FlatList가 "보인다"고 치는 기준. 조금만 걸쳐도 보인다고 쳐야 받은 광고를 이미 보이는 자리에
// 끼우지 않는다(AdSlotList.loadSlot).
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 1 };

interface Params {
  placement: AdPlacement;
  itemCount: number;
  // 그리드 열 수(한 줄 목록은 1).
  columnCount: number;
  // 광고를 두지 않는 쓰임(장비 검색 담기 등, AD-1)에서는 동의 흐름도 광고 요청도 하지 않는다.
  enabled: boolean;
}

// AD-1·AD-3·AD-5: 목록 화면 하나의 광고 자리 상태. 화면에 처음 포커스될 때 동의 흐름을 태우고
// (탭 목록은 포커스 전에 마운트될 수 있다 — 그때 묻지 않는다), 보이는 범위를 따라 가까운 자리만
// 요청하며, 언마운트 때 받은 광고를 모두 해제한다.
const useAdSlotListState = ({
  placement,
  itemCount,
  columnCount,
  enabled,
}: Params) => {
  const [slotList] = useState(() =>
    AdSlotList.from(placement, app.getAdService(), columnCount)
  );

  // 한 번 시작하면 포커스를 잃어도 그대로다(`start`가 두 번째부터는 아무것도 하지 않는다).
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      void slotList.start();
    }, [slotList, enabled])
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return () => {
      slotList.dispose();
    };
  }, [slotList, enabled]);

  useEffect(() => {
    slotList.setItemCount(itemCount);
  }, [slotList, itemCount]);

  // FlatList는 이 콜백이 렌더마다 바뀌는 것을 허용하지 않는다 — 한 번만 만든다.
  const [handleViewableItemsChanged] = useState(
    () =>
      ({
        viewableItems,
      }: {
        viewableItems: ViewToken<AdListEntry<unknown>>[];
      }) => {
        const ordinals = viewableItems
          .map(token => token.item?.ordinal)
          .filter((ordinal): ordinal is number => typeof ordinal === 'number');

        if (ordinals.length === 0) {
          return;
        }

        slotList.updateVisibleRange(Math.max(...ordinals));
      }
  );

  return {
    slotList,
    viewabilityConfig: VIEWABILITY_CONFIG,
    handleViewableItemsChanged,
  };
};

export default useAdSlotListState;
