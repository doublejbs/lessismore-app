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

// FAB과 마지막 카드 사이 숨. 카드 사이 간격(10)보다 넓어야 버튼이 목록에 붙어 보이지 않는다.
const CARD_GAP = 20;

/**
 * FAB이 지면 밑변에서 떠 있는 높이.
 *
 * iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) Layout 하단 세이프에어리어를 빼서
 * 화면 하단 기준이 된다 → 버튼을 탭바(=insets.bottom) 위 20pt에 띄운다.
 * **로딩 중에는 이 버튼을 렌더하지 않는다**(호출부 참고) — 첫 프레임 인셋이 정착하기 전이라
 * 여기서 계산한 위치가 탭바 뒤로 들어간다.
 */
export const getBagAddButtonBottom = (insetBottom: number): number =>
  Platform.select({
    ios: insetBottom + CARD_GAP,
    android: 0,
    default: 80,
  });

/**
 * 목록 스크롤 끝에 비워야 하는 높이(BAG-1).
 *
 * 마지막 카드가 FAB 아래로 들어가면 카드 **우측 무게**가 버튼에 가린다 — 목록 우측은
 * 배낭끼리 무게를 비교하는 축이라 한 장이라도 가려지면 비교가 끊긴다(2026-08-11 디자인 리뷰).
 * 버튼 자리(탭바 몫 포함) + 버튼 높이 + 숨을 그대로 더해 계산한다.
 */
export const getBagAddButtonClearance = (insetBottom: number): number =>
  getBagAddButtonBottom(insetBottom) + LiquidLayout.pillHeight + CARD_GAP;

// 배낭 추가 진입점(BAG-2). 배낭이 없으면 **입력 없이 즉시 생성**, 있으면 추가 액션시트.
const BagAddView: FC<Props> = ({ bag }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottom = getBagAddButtonBottom(insets.bottom);

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
