import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import BagTemplateDetail from '@/model/bag-template/BagTemplateDetail';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  detail: BagTemplateDetail;
}

const PILL_HEIGHT = 48;

const BagTemplateBottomBar: FC<Props> = ({ detail }) => (
  <View style={styles.container}>
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.secondary}
        onPress={() => detail.goToEdit()}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('bagTemplate.editGear')}
      >
        <PretendardText style={styles.secondaryText} weight='semibold'>
          {app.getL10n().t('bagTemplate.editGear')}
        </PretendardText>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.primary}
        onPress={() => detail.goToCreate()}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('bagTemplate.createBag')}
      >
        <PretendardText style={styles.primaryText} weight='semibold'>
          {app.getL10n().t('bagTemplate.createBag')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  secondary: {
    paddingHorizontal: 18,
    minHeight: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  primary: {
    flex: 1,
    minHeight: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(BagTemplateBottomBar);
