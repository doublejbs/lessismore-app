import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import FloatingPillButton from '@/components/FloatingPillButton';

const AddButtonView: FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) Layout 하단 세이프에어리어를 빼서
  // 화면 하단 기준이 된다 → 버튼을 탭바(=insets.bottom) 위 20pt에 띄운다.
  const bottom = Platform.select({
    ios: insets.bottom + 20,
    android: 0,
    default: 80,
  });

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
        style={[styles.addButton, { bottom }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    position: 'absolute',
    right: 0,
  },
});

export default AddButtonView;
