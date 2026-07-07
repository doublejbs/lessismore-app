import { FC, useEffect } from 'react';
import { View, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import BagUseless from '../../model/bag-useless/BagUseless';
import { observer } from 'mobx-react-lite';
import app from '../../model/app/App';
import BagUselessGearView from './BagUselessGearView';
import PretendardText from '@/components/PretendardText';
import { Ionicons } from '@expo/vector-icons';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  bagUseless: BagUseless;
}

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

  const renderGearItem = ({ item }: { item: any }) => (
    <BagUselessGearView gear={item} bagUseless={bagUseless} />
  );

  useEffect(() => {
    bagUseless.initialize();
  }, []);

  if (isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={handlePressBack}>
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
        <View style={styles.content}>
          <View style={styles.countRow}>
            <PretendardText weight='semibold' style={styles.countText}>
              전체 {allCount}개 중{' '}
              <PretendardText weight='bold' style={styles.countHighlight}>
                {selectedCount}
              </PretendardText>
              개 사용
            </PretendardText>
            <TouchableOpacity onPress={handlePressToggleSelectAll}>
              <PretendardText weight='medium' style={styles.selectAllText}>
                {selectedCount ? '전체 해제' : '전체 선택'}
              </PretendardText>
            </TouchableOpacity>
          </View>
          <FlatList
            data={gears}
            renderItem={renderGearItem}
            keyExtractor={item => item.getId()}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.confirmWrapper}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handlePressConfirm}
            >
              <PretendardText weight='semibold' style={styles.confirmLabel}>
                완료
              </PretendardText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    height: '100%',
    gap: Spacing.item,
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
  content: {
    paddingTop: Spacing.section,
    flexDirection: 'column',
    flex: 1,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  countHighlight: {
    color: Color.textPrimary,
  },
  selectAllText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
  list: {
    flex: 1,
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
