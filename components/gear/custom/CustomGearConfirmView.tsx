import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import CustomGear from '@/model/gear/custom/CustomGear';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { LiquidSemantic, LiquidType } from '@/constants/DesignTokens';

interface Props {
  customGear: CustomGear;
}

const CustomGearConfirmView: FC<Props> = ({ customGear }) => {
  const errorMessage = customGear.getErrorMessage();
  const isDisabled = customGear.getName().trim().length === 0;

  const handleClickConfirm = async () => {
    await customGear.register();
  };

  return (
    <View style={styles.container}>
      {errorMessage && (
        <PretendardText style={styles.errorMessage}>
          {errorMessage}
        </PretendardText>
      )}
      <LiquidPillButton
        label='확인'
        variant='primary'
        block
        onPress={handleClickConfirm}
        disabled={isDisabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
  },
  // 검증 실패는 의미색 — 리디자인해도 바꾸지 않는다.
  errorMessage: {
    width: '100%',
    textAlign: 'center',
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: LiquidSemantic.danger,
  },
});

export default observer(CustomGearConfirmView);
