import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import GearEdit from '@/model/gear/edit/GearEdit';
import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  LiquidLayout,
  LiquidSemantic,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  gearEdit: GearEdit;
}

// GE-2 하단 확인 바 — 이 화면의 주 액션 하나. 검증 실패 문구는 버튼 위에 둔다.
const GearEditConfirmView: FC<Props> = ({ gearEdit }) => {
  const errorMessage = gearEdit.getErrorMessage();

  const handleClickConfirm = async () => {
    await gearEdit.register();
  };

  return (
    <View style={styles.container}>
      {errorMessage && (
        <View style={styles.errorRow}>
          {/* 검증 실패는 의미색 — 리디자인해도 바꾸지 않는다. */}
          <PretendardText style={styles.errorText} weight='medium'>
            {errorMessage}
          </PretendardText>
        </View>
      )}
      <LiquidPillButton
        label='확인'
        variant='primary'
        block
        onPress={handleClickConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: 16,
  },
  errorRow: {
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: LiquidSemantic.danger,
  },
});

export default observer(GearEditConfirmView);
