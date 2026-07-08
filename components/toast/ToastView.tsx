import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import ToastManager from '@/model/toast/ToastManager';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
          <PretendardText style={styles.text}>{message}</PretendardText>
          {buttonText && (
            <TouchableOpacity style={styles.button} onPress={handleButtonPress}>
              <PretendardText weight='semibold' style={styles.buttonText}>
                {buttonText}
              </PretendardText>
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
    zIndex: 90,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.card,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    color: Color.background,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Radius.card,
  },
  buttonText: {
    color: Color.background,
    textAlign: 'center',
  },
});

export default observer(ToastView);
