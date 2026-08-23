import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagTemplateDetail from '@/model/bag-template/BagTemplateDetail';
import BagTemplateGearView from './BagTemplateGearView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  detail: BagTemplateDetail;
}

const BagTemplateCategoryView: FC<Props> = ({ category, gears, detail }) => (
  <View style={styles.container}>
    <PretendardText style={styles.category} weight='bold'>
      {category.getLabel()}
    </PretendardText>
    <View>
      {gears.map((gear, index) => (
        <BagTemplateGearView
          key={gear.getId()}
          gear={gear}
          detail={detail}
          divided={index > 0}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  category: {
    ...AcgType.rowSubtitle,
    marginBottom: 2,
    color: Acg.textMuted,
  },
});

export default observer(BagTemplateCategoryView);
