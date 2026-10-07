import { useCallback, useEffect, useRef, useState } from 'react';
import { ViewToken } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { reaction } from 'mobx';
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
  // 목록 내용이 통째로 바뀌는 열쇠(검색 결과의 검색어). 바뀌면 접힌 자리·보이는 범위를 되돌린다
  // (`AdSlotList.reset`) — 지난 목록에서 접힌 자리가 새 목록에서도 접힌 채 남지 않게.
  resetKey?: string | undefined;
}

// AD-1·AD-3·AD-5: 목록 화면 하나의 광고 자리 상태. 화면에 처음 포커스될 때 동의 흐름을 태우고
// (탭 목록은 포커스 전에 마운트될 수 있다 — 그때 묻지 않는다), 보이는 범위를 따라 가까운 자리만
// 요청하며, 언마운트 때 받은 광고를 모두 해제한다.
const useAdSlotListState = ({
  placement,
  itemCount,
  columnCount,
  enabled,
  resetKey,
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

  // 화면이 포커스돼 있는지 — 구독이 끝났을 때 보고 있는 화면이면 바로 다시 시작한다.
  const isFocusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      return () => {
        isFocusedRef.current = false;
      };
    }, [])
  );

  // SUB-4: 광고 제거를 구독하면 받은 광고를 해제하고 자리를 접는다. 구독이 끝나거나 로그아웃하면
  // 보고 있는 화면은 바로, 아니면 다음 포커스에 다시 시작한다(`start`가 구독 중이면 요청하지 않는다).
  useEffect(() => {
    if (!enabled) {
      return;
    }

    return reaction(
      () => app.getSubscriptionStore().isSubscribed(),
      isSubscribed => {
        if (isSubscribed) {
          slotList.dispose();

          return;
        }

        if (isFocusedRef.current) {
          void slotList.start();
        }
      }
    );
  }, [slotList, enabled]);

  useEffect(() => {
    slotList.setItemCount(itemCount);
  }, [slotList, itemCount]);

  // 첫 렌더에는 되돌릴 것이 없다 — 열쇠가 바뀔 때만 되돌린다.
  const lastResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (lastResetKeyRef.current === resetKey) {
      return;
    }

    lastResetKeyRef.current = resetKey;
    slotList.reset();
  }, [slotList, resetKey]);

  // FlatList는 이 콜백이 렌더마다 바뀌는 것을 허용하지 않는다 — 한 번만 만든다.
  const [handleViewableItemsChanged] = useState(
    () =>
      ({
        viewableItems,
      }: {
        // 광고 칸이 아닌 칸(소모품 카드 등)도 같은 뜻의 `ordinal`을 들고 있으면 함께 받는다.
        viewableItems: ViewToken<Pick<AdListEntry<unknown>, 'ordinal'>>[];
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
