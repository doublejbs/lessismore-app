import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import FloatingPillButton from '@/components/FloatingPillButton';

const AddButtonView: FC = () => {
  const router = useRouter();

  const handleClick = () => {
    app.getAnalyticsManager()?.logClick('gear_add');

    if (app.getFirebase().isLoggedIn()) {
      // GE-8: 검색/직접 선택 시트로 진입(창고 컨텍스트).
      router.push('/gear-add-options');
    } else {
      app.getLogInAlertManager()?.show();
    }
  };

  return (
    <View>
      <FloatingPillButton
        label='장비 추가'
        onPress={handleClick}
        variant='primary'
        style={styles.addButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    position: 'absolute',
    right: 0,
    bottom: Platform.select({
      ios: 80,
      android: 0,
      default: 80,
    }),
  },
});

export default AddButtonView;
