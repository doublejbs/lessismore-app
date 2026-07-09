import { FC, useEffect } from 'react';
import { View, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import BagUseless from '../../model/bag-useless/BagUseless';
import { observer } from 'mobx-react-lite';
import app from '../../model/app/App';
import BagUselessGearView from './BagUselessGearView';
import PretendardText from '@/components/PretendardText';
import { Ionicons } from '@expo/vector-icons';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';

interface Props {
  bagUseless: BagUseless;
}

const toKg = (grams: number) => Math.round((grams / 1000) * 100) / 100;

const BagUselessView: FC<Props> = ({ bagUseless }) => {
  const isInitialized = bagUseless.isInitialized();
  const allCount = bagUseless.getAllCount();
  const selectedCount = bagUseless.getSelectedCount();
  const gears = bagUseless.getGears();

  const handlePressToggleSelectAll = () => {
    app.getAnalyticsManager()?.logClick('useless_select_all', {
      selected: selectedCount === 0,
    });
    bagUseless.toggleSelectAll();
  };

  const handlePressConfirm = () => {
    app.getAnalyticsManager()?.logClick('useless_confirm');
    bagUseless.save();
  };

  const handlePressBack = () => {
    bagUseless.back();
  };

  const renderGearItem = ({ item }: { item: Gear }) => (
    <BagUselessGearView gear={item} bagUseless={bagUseless} />
  );

  useEffect(() => {
    bagUseless.initialize();
  }, []);

  if (!isInitialized) {
    return null;
  }

  const totalKg = toKg(
    gears.reduce((acc, gear) => acc + Number(gear.getWeight()), 0)
  );
  const selectedKg = toKg(
    gears
      .filter(gear => bagUseless.isSelected(gear))
      .reduce((acc, gear) => acc + Number(gear.getWeight()), 0)
  );
  const percent = allCount > 0 ? Math.round((selectedCount / allCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={handlePressBack}
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel='뒤로가기'
        >
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleColumn}>
        <PretendardText weight='bold' style={styles.title}>
          실제로 사용했던 장비만
        </PretendardText>
        <PretendardText weight='bold' style={styles.title}>
          선택해주세요
        </PretendardText>
      </View>

      <View style={styles.progress}>
        <View style={styles.countRow}>
          <PretendardText weight='bold' style={styles.count}>
            {selectedCount}
            <PretendardText weight='medium' style={styles.countTotal}>
              {' '}
              / {allCount} 사용
            </PretendardText>
          </PretendardText>
          <TouchableOpacity onPress={handlePressToggleSelectAll} hitSlop={8}>
            <PretendardText weight='medium' style={styles.selectAllText}>
              {selectedCount ? '전체 해제' : '전체 선택'}
            </PretendardText>
          </TouchableOpacity>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>
        <PretendardText weight='medium' style={styles.weightText}>
          {selectedKg}kg / {totalKg}kg
        </PretendardText>
      </View>

      <FlatList
        data={gears}
        renderItem={renderGearItem}
        keyExtractor={item => item.getId()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.confirmWrapper}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handlePressConfirm}
          activeOpacity={0.8}
        >
          <PretendardText weight='semibold' style={styles.confirmLabel}>
            완료
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    height: '100%',
  },
  backRow: {
    width: '100%',
    paddingVertical: 7,
  },
  titleColumn: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 28,
    color: Color.textPrimary,
  },
  progress: {
    marginTop: Spacing.section,
    marginBottom: 16,
    gap: 10,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  count: {
    fontSize: 28,
    color: Color.textPrimary,
  },
  countTotal: {
    fontSize: 16,
    color: Color.textSecondary,
  },
  selectAllText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: Color.divider,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Color.textPrimary,
  },
  weightText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 16,
    paddingBottom: 16,
  },
  confirmWrapper: {
    width: '100%',
    paddingVertical: Spacing.item,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Color.textPrimary,
    paddingVertical: 16,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  confirmLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default observer(BagUselessView);
