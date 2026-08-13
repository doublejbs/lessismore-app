import { FC } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '@/model/gear/Gear';
import BagTemplateDetail from '@/model/bag-template/BagTemplateDetail';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  detail: BagTemplateDetail;
  divided?: boolean;
}

const BagTemplateGearView: FC<Props> = ({ gear, detail, divided = false }) => (
  <View style={[styles.background, divided && styles.divided]}>
    <TouchableOpacity
      style={styles.row}
      onPress={() => detail.goToGear(gear)}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={`${gear.getDisplayName()}, ${gear.getWeight()}g`}
    >
      <View style={styles.textWrap}>
        {gear.getDisplayCompany() ? (
          <PretendardText style={styles.company} numberOfLines={1}>
            {gear.getDisplayCompany()}
          </PretendardText>
        ) : null}
        <PretendardText style={styles.name} weight='medium' numberOfLines={2}>
          {gear.getDisplayName()}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          <AcgDisplayText style={styles.metaNumber}>
            {`${gear.getWeight()}g`}
          </AcgDisplayText>
          {gear.getDisplayColor() ? ` · ${gear.getDisplayColor()}` : ''}
        </PretendardText>
      </View>
      <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: Acg.paper,
    paddingVertical: AcgRow.paddingVertical,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  row: {
    width: '100%',
    minHeight: AcgRow.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  company: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  name: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default observer(BagTemplateGearView);
