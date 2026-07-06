import { FC } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingHeaderView from './BagPackingHeaderView';
import BagPackingCategorySectionView from './BagPackingCategorySectionView';
import BagPackingCompleteView from './BagPackingCompleteView';
import app from '@/model/app/App';

interface Props {
  bagPacking: BagPacking;
}

const BagPackingView: FC<Props> = ({ bagPacking }) => {
  const initialized = bagPacking.isInitialized();

  const handlePressBack = () => {
    void bagPacking.close();
  };

  const handlePressReset = () => {
    app.getAlertManager()?.show({
      message: '패킹을 처음부터 다시 시작할까요?',
      confirmText: '처음부터 다시',
      onConfirm: async () => {
        await bagPacking.reset();
      },
    });
  };

  if (!initialized) {
    return null;
  }

  const isEmpty = bagPacking.isEmpty();
  const showCompleteCard = bagPacking.shouldShowCompleteCard();
  const categories = bagPacking.getGearsByCategory();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
            <Ionicons name='chevron-back' size={24} color='#191F28' />
          </TouchableOpacity>
          {!isEmpty && (
            <TouchableOpacity onPress={handlePressReset} activeOpacity={0.7}>
              <PretendardText style={styles.resetText} weight='medium'>
                처음부터 다시
              </PretendardText>
            </TouchableOpacity>
          )}
        </View>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <PretendardText style={styles.emptyText} weight='medium'>
              담긴 장비가 없어요
            </PretendardText>
          </View>
        ) : (
          <>
            <BagPackingHeaderView bagPacking={bagPacking} />
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {categories.map(({ category, gears }) => (
                <BagPackingCategorySectionView
                  key={category.getFilter()}
                  category={category}
                  gears={gears}
                  bagPacking={bagPacking}
                />
              ))}
            </ScrollView>
          </>
        )}

        {showCompleteCard && <BagPackingCompleteView bagPacking={bagPacking} />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resetText: {
    fontSize: 15,
    color: '#8B95A1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    gap: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8B95A1',
  },
});

export default observer(BagPackingView);
