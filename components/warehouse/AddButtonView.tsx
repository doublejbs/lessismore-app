import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingPillButton from '@/components/FloatingPillButton';
import useGearAddAction from '@/components/warehouse/useGearAddAction';
import app from '@/model/app/App';

const AddButtonView: FC = () => {
  const insets = useSafeAreaInsets();
  const handleClick = useGearAddAction();

  // iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) Layout 하단 세이프에어리어를 빼서
  // 화면 하단 기준이 된다 → 버튼을 탭바(=insets.bottom) 위 20pt에 띄운다.
  const bottom = Platform.select({
    ios: insets.bottom + 20,
    android: 0,
    default: 80,
  });

  return (
    <View>
      <FloatingPillButton
        label={app.getL10n().t('warehouse.addGear')}
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

export default observer(AddButtonView);
