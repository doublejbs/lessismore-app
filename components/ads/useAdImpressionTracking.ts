import { useEffect } from 'react';
import { useIsFocused } from 'expo-router';
import type { NativeAd } from 'react-native-google-mobile-ads';
import app from '@/model/app/App';

// SUB-9: 광고 뷰가 광고를 그릴 때 누적 노출을 센다(자리 5곳 합산). 같은 광고 객체는 한 번만 센다 —
// 다시 그려지거나 목록 가상화로 다시 붙어도 늘지 않는다(`SubscriptionNudge.recordAdImpression`).
// 광고를 그린 화면이 포커스돼 있을 때만 안내 시트를 띄울 수 있다 — 그 위에 시트·모달 화면이 떠 있거나
// 뒤에 미리 마운트된 탭이면 세기만 한다.
// 포커스는 `useIsFocused`로 읽는다. `useFocusEffect`로 잡은 ref는 마운트 직후 같은 커밋의 효과에서 아직
// false라(expo-router가 포커스 효과를 늦게 붙인다) 포커스된 화면의 광고도 "뒤 화면"으로 잘못 봤다.
const useAdImpressionTracking = (nativeAd: NativeAd, isRendered: boolean) => {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    app.getSubscriptionNudge()?.recordAdImpression(nativeAd, isFocused);
  }, [nativeAd, isRendered, isFocused]);
};

export default useAdImpressionTracking;
