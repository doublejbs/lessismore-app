import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import ToastManager from '@/model/toast/ToastManager';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  toastManager: ToastManager;
  bottom: number;
}

/**
 * 전역 토스트 (Liquid Depth, APP-4).
 *
 * 잉크 면 + 흰 글자다 — 지면과 흰 카드가 밝은 이 시스템에서 알림은 면 색이 반대여야 눈에
 * 걸린다(유리로 두면 아래 콘텐츠에 묻힌다). 액션이 있으면 그 위에 흰 알약을 얹어 잉크 면
 * 안에서 다시 한 번 면을 뒤집는다.
 */
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
            weight='medium'
            style={[styles.text, buttonText ? styles.textWithButton : null]}
          >
            {message}
          </PretendardText>
          {buttonText && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleButtonPress}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel={buttonText}
              hitSlop={BUTTON_HIT_SLOP}
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

// 알약(36)을 HIG 최소 터치 타깃까지 채우는 여유 — 토스트 안이라 알약 자체를 키울 수 없다.
const BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // 하단 CTA(예: 박지 상세 '배낭 여행지로 설정')와 좌우 끝선을 맞춰
    // 두 요소가 어긋나 보이지 않게 한다(하단바 marginHorizontal 20과 동일).
    left: LiquidLayout.screenH,
    right: LiquidLayout.screenH,
    // 안쪽 여백은 이식 전과 같은 20이다(토큰 치환 때 16으로 좁아졌던 값을 되돌렸다).
    // 화면 좌우 여백(`screenH`)과 값은 같지만 뜻이 다르므로 **카드 여백** 쪽을 참조한다 —
    // 이건 잉크 카드의 안쪽 여백이고, 화면 여백을 조정할 때 함께 끌려가야 할 값이 아니다.
    paddingHorizontal: LiquidLayout.cardPadLg,
    paddingVertical: 14,
    zIndex: 90,
    backgroundColor: Liquid.ink,
    borderRadius: LiquidRadius.card,
    // 잉크 면을 지면에서 떼어 놓는다 — 잉크 CTA와 같은 무게로 뜬다.
    boxShadow: LiquidShadow.cta,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.surface,
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
    // 잉크 면 위에서 흐리게 묻히지 않게 흰 채움(글자는 잉크)으로 대비를 뒤집는다.
    backgroundColor: Liquid.surface,
    borderRadius: LiquidRadius.pill,
  },
  buttonText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
    textAlign: 'center',
  },
});

export default observer(ToastView);
