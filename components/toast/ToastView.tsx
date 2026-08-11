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
          <PretendardText
            style={[styles.text, buttonText ? styles.textWithButton : null]}
          >
            {message}
          </PretendardText>
          {buttonText && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleButtonPress}
              accessibilityRole='button'
              accessibilityLabel={buttonText}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
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
    // 하단 CTA(예: 박지 상세 '배낭 여행지로 설정')와 좌우 끝선을 맞춰
    // 두 요소가 어긋나 보이지 않게 한다(하단바 marginHorizontal 20과 동일).
    left: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 90,
    backgroundColor: Color.toastBg,
    borderRadius: Radius.card,
    // 진회색 토스트가 아래 요소와 붙어 보이지 않게 그림자 + 얇은 밝은 테두리로 경계를 만든다.
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    color: Color.background,
    textAlign: 'center',
  },
  // 액션 버튼이 있으면 메시지는 좌측 정렬(2단 레이아웃).
  textWithButton: {
    textAlign: 'left',
  },
  button: {
    minHeight: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    // 검정 토스트 위에서 흐리게 묻히지 않게 흰 채움(텍스트 검정)으로 대비를 높인다.
    backgroundColor: Color.background,
    borderRadius: Radius.chip,
  },
  buttonText: {
    color: Color.textPrimary,
    textAlign: 'center',
  },
});

export default observer(ToastView);
