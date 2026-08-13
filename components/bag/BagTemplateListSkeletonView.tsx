import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';

const BagTemplateListSkeletonView: FC = () => {
  return (
    <View style={styles.container}>
      {[0, 1, 2, 3].map(index => (
        <View key={index} style={styles.row}>
          <View style={styles.body}>
            <View style={styles.nameBar} />
            <View style={styles.metaBar} />
          </View>
          <View style={styles.menuBar} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    minHeight: AcgRow.minHeight,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: AcgRow.paddingVertical,
  },
  nameBar: {
    width: 150,
    height: AcgType.rowTitle.lineHeight,
    backgroundColor: '#E3E3E3',
    borderRadius: 2,
  },
  metaBar: {
    width: 120,
    height: AcgType.rowSubtitle.lineHeight,
    backgroundColor: '#E3E3E3',
    borderRadius: 2,
  },
  menuBar: {
    width: 44,
  },
});

export default BagTemplateListSkeletonView;
