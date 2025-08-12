import { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ToastManager from '@/model/toast/ToastManager';
import { observer } from 'mobx-react-lite';

interface Props {
  toastManager: ToastManager;
  bottom: number;
}

const ToastView: FC<Props> = ({ toastManager, bottom }) => {
  const message = toastManager.getMessage();
  const isVisible = toastManager.isVisible();

  if (isVisible) {
    return (
      <View style={[styles.container, { bottom }]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
});

export default observer(ToastView);
