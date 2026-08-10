import { FC } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import LiquidBottomSheet from '@/components/liquid/LiquidBottomSheet';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  visible: boolean;
  /** 이미 닉네임이 있으면 '수정', 없으면 '설정' — 문구가 갈린다 */
  hasNickname: boolean;
  value: string;
  onChangeValue: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

/**
 * AU-4 닉네임 설정·수정 시트 (Liquid Depth).
 *
 * 가운데 뜨는 알럿이 아니라 **하단 시트**다 — 입력이 곧 키보드를 부르므로, 키보드 위에
 * 붙는 면이 가장 짧은 거리다(로그인 시트와 같은 문법).
 */
const InfoNicknameEditView: FC<Props> = ({
  visible,
  hasNickname,
  value,
  onChangeValue,
  onCancel,
  onSubmit,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* 시트 밖을 눌러 닫는다 — 시트 자체는 아래 KeyboardAvoidingView가 든다. */}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.overlay]}
        onPress={onCancel}
        accessibilityRole='button'
        accessibilityLabel='닉네임 편집 닫기'
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetHolder}
        pointerEvents='box-none'
      >
        <LiquidBottomSheet contentStyle={styles.sheetContent}>
          <PretendardText weight='bold' style={styles.title}>
            {hasNickname ? '닉네임 수정' : '닉네임 설정'}
          </PretendardText>
          <PretendardText style={styles.description}>
            {hasNickname
              ? '새로 쓸 닉네임을 알려주세요'
              : '창고와 배낭에 함께 보일 이름이에요'}
          </PretendardText>

          <TextInput
            value={value}
            onChangeText={onChangeValue}
            placeholder='닉네임을 입력하세요'
            placeholderTextColor={Liquid.inkMuted}
            style={styles.input}
            autoFocus
            onSubmitEditing={onSubmit}
            returnKeyType='done'
          />

          <View style={styles.buttonRow}>
            <LiquidPillButton
              label='취소'
              variant='secondary'
              onPress={onCancel}
              style={styles.button}
            />
            <LiquidPillButton
              label='저장'
              variant='primary'
              onPress={onSubmit}
              disabled={value.trim() === ''}
              style={styles.button}
            />
          </View>
        </LiquidBottomSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: Liquid.scrim,
  },
  sheetHolder: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // 키보드가 올라오면 시트가 그 위에 붙으므로 기본(44)보다 좁게 둔다.
  sheetContent: {
    paddingBottom: 28,
  },
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    textAlign: 'center',
  },
  description: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
  /**
   * `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다(TextInput 예외).
   * 높이·모서리는 아래 버튼 줄과 같은 알약이라 입력과 액션이 한 덩어리로 읽힌다.
   */
  input: {
    marginTop: 20,
    height: LiquidLayout.pillHeight,
    paddingHorizontal: 20,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    fontFamily: 'Pretendard-Medium',
    fontSize: 15,
    color: Liquid.ink,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
  },
});

export default InfoNicknameEditView;
