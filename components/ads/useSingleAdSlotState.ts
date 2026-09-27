import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import SingleAdSlot from '@/model/ads/SingleAdSlot';
import AdPlacement from '@/model/ads/AdPlacement';
import app from '@/model/app/App';

interface Params {
  placement: AdPlacement;
  // AD-3: 이 자리가 동의 흐름을 시작해도 되는지. 홈은 앱을 켜면 바로 나오는 화면이라 false다.
  startsConsentFlow: boolean;
  // 광고를 두지 않는 쓰임(내 창고 장비·담기 흐름 등, AD-1)에서는 동의 흐름도 광고 요청도 하지 않는다.
  // 화면에 있는 동안 false로 바뀌면(창고에 담음) 받은 광고를 해제하고 자리를 접는다.
  enabled: boolean;
}

// AD-1·AD-3·AD-5: 한 장짜리 광고 자리 상태. 화면이 포커스될 때 광고를 요청하고(탭 화면은 포커스
// 전에 마운트될 수 있다 — 그때 묻지 않는다), 언마운트·비활성화 때 받은 광고를 해제한다.
const useSingleAdSlotState = ({
  placement,
  startsConsentFlow,
  enabled,
}: Params) => {
  const [slot] = useState(() =>
    SingleAdSlot.from(placement, app.getAdService(), startsConsentFlow)
  );

  // 받지 못했으면 포커스될 때마다 다시 시도한다(`start`는 광고를 들고 있으면 아무것도 하지 않는다).
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      void slot.start();
    }, [slot, enabled])
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return () => {
      slot.dispose();
    };
  }, [slot, enabled]);

  return { slot };
};

export default useSingleAdSlotState;
