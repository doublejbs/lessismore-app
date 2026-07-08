import React, { FC } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Bag from '@/model/bag/Bag';
import app from '@/model/app/App';
import FloatingPillButton from '@/components/FloatingPillButton';

interface Props {
  bag: Bag;
}

// 배낭 추가 진입점. 배낭이 없으면 바로 생성 폼, 있으면 추가 액션시트(모두 네이티브 formSheet 라우트).
const BagAddView: FC<Props> = ({ bag }) => {
  const router = useRouter();

  const handlePressAdd = () => {
    app.getAnalyticsManager()?.logClick('bag_add');

    if (!app.getFirebase()?.isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    if (bag.isEmpty()) {
      router.push('/bag-new');
    } else {
      router.push('/bag-add-options');
    }
  };

  return (
    <FloatingPillButton
      label='배낭 추가'
      onPress={handlePressAdd}
      variant='primary'
      style={styles.floatingButton}
    />
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: Platform.select({
      ios: 80,
      android: 0,
      default: 80,
    }),
  },
});

export default BagAddView;
