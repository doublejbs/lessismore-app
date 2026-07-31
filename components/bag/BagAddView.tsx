import { FC } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Bag from '@/model/bag/Bag';
import app from '@/model/app/App';
import { createQuickBag } from '@/model/bag/QuickBagDefaults';
import FloatingPillButton from '@/components/FloatingPillButton';

interface Props {
  bag: Bag;
}

// 배낭 추가 진입점(BAG-2). 배낭이 없으면 **입력 없이 즉시 생성**, 있으면 추가 액션시트.
const BagAddView: FC<Props> = ({ bag }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) Layout 하단 세이프에어리어를 빼서
  // 화면 하단 기준이 된다 → 버튼을 탭바(=insets.bottom) 위 20pt에 띄운다.
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

  return (
    <FloatingPillButton
      label='배낭 추가'
      onPress={handlePressAdd}
      variant='primary'
      style={[styles.floatingButton, { bottom }]}
    />
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 20,
  },
});

export default BagAddView;
