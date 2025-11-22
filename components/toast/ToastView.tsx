import { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ToastManager from '@/model/toast/ToastManager';
import { observer } from 'mobx-react-lite';

interface Props {
  toastManager: ToastManager;
  bottom: number;
}

const ToastView: FC<Props> = ({ toastManager, bottom }) => {
  const message = toastManager.getMessage();
  const isVisible = toastManager.isVisible();
  const buttonText = toastManager.getButtonText();
  const onButtonPress = toastManager.getOnButtonPress();

  const handleButtonPress = () => {
    if (onButtonPress) {
      onButtonPress();
    }
    toastManager.hide();
  };

  if (isVisible) {
    return (
      <View style={[styles.container, { bottom }]}>
        <View style={styles.content}>
          <Text style={styles.text}>{message}</Text>
          {buttonText && (
            <TouchableOpacity style={styles.button} onPress={handleButtonPress}>
              <Text style={styles.buttonText}>{buttonText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '90%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 20,
    backgroundColor: 'black',
    borderRadius: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default observer(ToastView);
