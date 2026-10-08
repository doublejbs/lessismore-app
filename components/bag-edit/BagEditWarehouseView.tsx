import { FC } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import BagEdit from '../../model/bag-edit/BagEdit';
import BagEditWarehouseGearView from './BagEditWarehouseGearView';
import SearchEmptyCustomAddView from '@/components/search/SearchEmptyCustomAddView';
import useSearchEmptyCustomAdd from '@/components/search/useSearchEmptyCustomAdd';
import SearchEmptySource from '@/model/search/SearchEmptySource';
import SearchEmptyButtonVariant from '@/model/search/SearchEmptyButtonVariant';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit }) => {
  // SR-11: 저장 시 창고 + 이 배낭에 담는다(템플릿 편집이면 창고만).
  const handlePressCustomAdd = useSearchEmptyCustomAdd({
    source: SearchEmptySource.Bag,
    bagId: bagEdit.getCustomAddBagId(),
  });

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
        // SR-11: 하단 `완료`가 이 화면의 주 액션이라 보조 알약으로 둔다.
        bagEdit.getQuery().trim() ? (
          <SearchEmptyCustomAddView
            query={bagEdit.getQuery()}
            variant={SearchEmptyButtonVariant.Secondary}
            onPressAdd={handlePressCustomAdd}
          />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 행이 각자 종이 면이라 붙여 두면 한 덩어리 흰 면으로 읽힌다 — 홈 목록과 같은 8px로
  // 벌린다(2026-08-04 시뮬레이터 확인).
  contentContainer: {
    paddingBottom: 20,
    gap: 8,
    flexGrow: 1,
  },
});

export default observer(BagEditWarehouseView);
