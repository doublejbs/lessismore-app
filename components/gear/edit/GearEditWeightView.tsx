import { forwardRef } from 'react';
import { View, TextInput } from 'react-native';
import GearEdit from '@/model/gear/edit/GearEdit';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  gearEdit: GearEdit;
  onFocus?: () => void;
}

const GearEditWeightView = forwardRef<TextInput, Props>(
  ({ gearEdit, onFocus }, ref) => {
    const weight = gearEdit.getWeight() || '';

    const handleChangeWeight = (text: string) => {
      const trimmedValue = text.trim();

      if (trimmedValue.length) {
        const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

        if (isNaN(number)) {
          return;
        } else {
          gearEdit.setWeight(String(number));
        }
      } else {
        gearEdit.setWeight(trimmedValue);
      }
    };

    return (
      <View
        style={{
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <PretendardText
          weight='medium'
          style={{
            ...AcgType.rowSubtitle,
          }}
        >
          {app.getL10n().t('gearEdit.weight')}
        </PretendardText>
        <TextInput
          ref={ref}
          style={{
            borderRadius: Radius.input,
            backgroundColor: Color.inputBg,
            paddingHorizontal: 12,
            paddingVertical: 12,
            // 단일행 입력이라 lineHeight를 얹지 않는다(안드로이드에서 커서 높이가 어긋난다).
            fontSize: AcgType.control.fontSize,
            letterSpacing: AcgType.control.letterSpacing,
          }}
          onChangeText={handleChangeWeight}
          value={String(weight)}
          placeholder={app.getL10n().t('gearEdit.weightPlaceholder')}
          keyboardType='numeric'
          placeholderTextColor={Color.textSecondary}
          onFocus={onFocus}
        />
      </View>
    );
  }
);

GearEditWeightView.displayName = 'GearEditWeightView';

export default observer(GearEditWeightView);
