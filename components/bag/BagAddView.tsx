import { FC } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Bag from '@/model/bag/Bag';
import app from '@/model/app/App';
import { Ionicons } from '@expo/vector-icons';
import { createQuickBag } from '@/model/bag/QuickBagDefaults';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  bag: Bag;
}

// 배낭 추가 진입점(BAG-2). 배낭이 없으면 **입력 없이 즉시 생성**, 있으면 추가 액션시트.
const BagAddView: FC<Props> = ({ bag }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) Layout 하단 세이프에어리어를 빼서
  // 화면 하단 기준이 된다 → 버튼을 탭바(=insets.bottom) 위 20pt에 띄운다.
  // **로딩 중에는 이 버튼을 렌더하지 않는다**(호출부 참고) — 첫 프레임 인셋이 정착하기 전이라
  // 여기서 계산한 위치가 탭바 뒤로 들어간다.
  const bottom = Platform.select({
    ios: insets.bottom + 20,
    android: 0,
    default: 80,
  });

  const handlePressAdd = async () => {
    app.getAnalyticsManager()?.logClick('bag_add');

    if (!app.getFirebase()?.isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    if (bag.isEmpty()) {
      await createQuickBag(router);
    } else {
      router.push('/bag-add-options');
    }
  };

  // 잉크 알약 + 라임 `add`(핸드오프 §5 FAB). 플로팅 액션은 Liquid 프리미티브
  // (`LiquidPillButton`)로 그린다 — 구세대 공용 `FloatingPillButton`은 마지막 소비처인
  // 창고 플로팅 `장비 추가`가 상단 크롬으로 올라가며 2026-08-11에 지워졌다.
  return (
    <LiquidPillButton
      label='배낭 추가'
      onPress={handlePressAdd}
      variant='primary'
      leading={<Ionicons name='add' size={20} color={Liquid.lime} />}
      style={[styles.floatingButton, { bottom }]}
    />
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: LiquidLayout.screenH,
  },
});

export default BagAddView;
