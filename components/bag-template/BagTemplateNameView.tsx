import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import BagTemplateDetail from '@/model/bag-template/BagTemplateDetail';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  detail: BagTemplateDetail;
}

const BagTemplateNameView: FC<Props> = ({ detail }) => (
  <TouchableOpacity
    style={styles.container}
    onPress={() => detail.openNameEdit()}
    accessibilityRole='button'
    accessibilityLabel={app.getL10n().t('bagTemplate.nameEdit')}
  >
    <PretendardText
      style={styles.name}
      weight='semibold'
      numberOfLines={2}
    >
      {detail.getName()}
    </PretendardText>
    <Ionicons name='pencil' size={15} color={Acg.textMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 44,
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
    gap: 6,
  },
  name: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default observer(BagTemplateNameView);
