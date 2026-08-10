import { FC } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import BagEdit from '../../model/bag-edit/BagEdit';
import BagEditWarehouseGearView from './BagEditWarehouseGearView';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit }) => {
  const renderGearItem = ({ item }: { item: any }) => {
    return <BagEditWarehouseGearView gear={item} bagEdit={bagEdit} />;
  };

  const gearData = bagEdit.mapWarehouseGears(gear => gear);

  return (
    <FlatList
      data={gearData}
      renderItem={renderGearItem}
      keyExtractor={item => item.getId()}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        bagEdit.getQuery().trim() ? (
          // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions).
          <View style={styles.empty}>
            <PretendardText style={styles.emptyFact} weight='bold'>
              검색 결과가 없어요
            </PretendardText>
            <PretendardText style={styles.emptyNext}>
              다른 이름이나 브랜드로 찾아봐요
            </PretendardText>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 행이 각자 카드 면이라 붙여 두면 한 덩어리 흰 면으로 읽힌다 — 카드 사이 간격으로 벌린다.
  contentContainer: {
    paddingBottom: 20,
    gap: LiquidLayout.listGap,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 60,
  },
  emptyFact: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
  emptyNext: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
});

export default observer(BagEditWarehouseView);
