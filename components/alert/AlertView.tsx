import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  GestureResponderEvent,
  ViewStyle,
} from 'react-native';
import AlertManager from '@/model/alert/AlertManager';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  alertManager: AlertManager;
}

/**
 * 전역 확인 알럿 (Liquid Depth, APP-3).
 *
 * 지면을 잉크 막(`Liquid.scrim`)으로 가라앉히고 그 위에 흰 카드 하나를 띄운다 — 이 시스템에서
 * 구획은 그림자가 아니라 면이 맡는다. 순수 검정 막을 쓰지 않는 이유는 팔레트에 검정이 없어서다.
 *
 * 버튼은 두 알약이고 무게가 갈린다: 확정은 잉크(주 액션), 취소는 가라앉은 면(조용한 보조).
 * **파괴적 확정에 danger 알약을 쓰지 않는다** — `AlertManager`는 파괴 여부를 모르고
 * (`message`·`confirmText`·`onConfirm`뿐) 그 API를 이번 범위에서 바꾸지 않기로 했다.
 * 되돌릴 수 없음은 지금도 확정 라벨(`삭제하기`)이 말한다.
 */
const AlertView: FC<Props> = ({ alertManager }) => {
  const isVisible = alertManager.isVisible();
  const message = alertManager.getMessage();
  const confirmText = alertManager.getConfirmText();

  const handleClickCancel = (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alertManager.hide();
  };

  const handleClickConfirm = (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alertManager.confirm();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType='fade'
      onRequestClose={handleClickCancel}
    >
      <View style={styles.scrim}>
        <View style={styles.card}>
          <PretendardText weight='bold' style={styles.message}>
            {message}
          </PretendardText>
          <View style={styles.buttons}>
            <LiquidPillButton
              label='취소하기'
              variant='quiet'
              paddingHorizontal={BUTTON_PAD_H}
              onPress={handleClickCancel}
              style={buttonStyle}
            />
            <LiquidPillButton
              label={confirmText}
              paddingHorizontal={BUTTON_PAD_H}
              onPress={handleClickConfirm}
              style={buttonStyle}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 두 알약이 카드 폭을 반씩 나눠 갖는다 — 확정이 넓으면 취소를 잘못 누르기 쉽고, 반대면
// 주 액션이 작아진다. 프리미티브의 기본값(`alignSelf: 'flex-start'`)을 여기서 덮는다.
const buttonStyle: ViewStyle = {
  flex: 1,
};

/**
 * 알약 좌우 여백을 기본(24)에서 좁힌다 — 폭이 카드의 반(360dp 기기에서 155)으로 정해져
 * 있어 기본값이면 가장 긴 확정 라벨(`처음부터 다시`)이 0.2px 차이로 말줄임된다.
 */
const BUTTON_PAD_H = 16;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: Liquid.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    // 좁은 기기(320pt)에서도 카드가 화면 밖으로 나가지 않게 좌우를 비운다.
    paddingHorizontal: LiquidLayout.screenH,
  },
  /**
   * 폭을 고정하지 않는다 — 옛 값(350)은 iPhone SE(320pt) 폭을 넘어 카드가 잘렸다.
   * 상한만 두어 큰 기기에서 문장이 지나치게 길어지지 않게 한다.
   *
   * `alignSelf: 'stretch'`가 아니라 **`width: '100%'`** 다 — stretch는 상한(360)에 걸리는
   * 순간 교차축 정렬이 `flex-start`로 떨어져 넓은 화면(Pro Max·iPad·웹)에서 카드가 좌측에
   * 붙는다. 폭을 직접 주면 부모의 `alignItems: 'center'`가 그대로 살아 가운데 머문다.
   */
  card: {
    width: '100%',
    maxWidth: 360,
    padding: LiquidLayout.cardPadLg,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  message: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    marginBottom: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
});

export default observer(AlertView);
