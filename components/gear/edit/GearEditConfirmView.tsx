import { FC } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import GearEdit from '@/model/gear/edit/GearEdit';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';

interface Props {
  gearEdit: GearEdit;
}

const GearEditConfirmView: FC<Props> = ({ gearEdit }) => {
  const errorMessage = gearEdit.getErrorMessage();

  const handleClickConfirm = async () => {
    await gearEdit.register();
  };

  return (
    <View
      style={{
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'column',
        paddingHorizontal: 16,
        gap: 16,
      }}
    >
      {errorMessage && (
        <View
          style={{
            width: '100%',
            alignItems: 'center',
          }}
        >
          <PretendardText
            style={{
              color: 'red',
              ...AcgType.rowSubtitle,
            }}
          >
            {errorMessage}
          </PretendardText>
        </View>
      )}
      <TouchableOpacity
        style={{
          width: '100%',
          backgroundColor: Color.textPrimary,
          paddingVertical: 12,
          borderRadius: Radius.card,
          alignItems: 'center',
        }}
        onPress={handleClickConfirm}
      >
        <PretendardText
          weight='semibold'
          style={{
            color: Color.background,
            ...AcgType.rowSubtitle,
          }}
        >
          확인
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

export default observer(GearEditConfirmView);
