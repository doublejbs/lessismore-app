import { FC, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagDetailGearView from './BagDetailGearView';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  bagDetail: BagDetail;
  onRefReady?: (categoryFilter: string, ref: View | null) => void;
}

const BagDetailCategoryView: FC<Props> = ({
  category,
  gears,
  bagDetail,
  onRefReady,
}) => {
  const categoryRef = useRef<View>(null);

  useEffect(() => {
    if (categoryRef.current && onRefReady) {
      onRefReady(category.getFilter(), categoryRef.current);
    }
  }, [category, onRefReady]);

  return (
    <View ref={categoryRef} style={styles.container}>
      <PretendardText style={styles.categoryTitle} weight='bold'>
        {bagDetail.getCategoryName(category.getFilter())}
      </PretendardText>
      <View style={styles.gearList}>
        {gears.map((gear, index) => (
          <BagDetailGearView
            key={gear.getId()}
            gear={gear}
            bagDetail={bagDetail}
            divided={index > 0}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  /**
   * 카테고리는 **묶음 안의 라벨**이라 섹션 제목보다 한 단 작다 — 같은 크기로 두면
   * 목록 안에 섹션이 여럿 있는 것처럼 읽힌다. 행 이름과도 크기가 갈려야 한다.
   */
  categoryTitle: {
    ...AcgType.rowSubtitle,
    marginBottom: 2,
    color: Acg.textMuted,
  },
  // 행 사이 간격은 두지 않는다 — 헤어라인이 가르고, 여백은 행 자체의 패딩이 맡는다.
  gearList: {
    gap: 0,
  },
});

export default BagDetailCategoryView;
