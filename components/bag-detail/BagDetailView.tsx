import { observer } from 'mobx-react-lite';
import { FC, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import BagDetailCategoryView from './BagDetailCategoryView';
import BagDetailChartView from './BagDetailChartView';
import BagDetailDateView from './BagDetailDateView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetailNameView from './BagDetailNameView';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import BagDetailAddButtonView from './BagDetailAddButtonView';
import ShareButtonView from './ShareButtonView';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailView: FC<Props> = ({ bagDetail }) => {
  const initialized = bagDetail.isInitialized();

  const handlePressBack = () => {
    bagDetail.back();
  };

  useEffect(() => {
    bagDetail.initialize();
  }, []);

  if (initialized) {
    const weight = bagDetail.getWeight();
    const gears = bagDetail.getGears();

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handlePressBack}
            >
              <Ionicons name='chevron-back' size={24} color='#191F28' />
            </TouchableOpacity>
            <Text style={styles.weightText}>{weight}kg</Text>
            <ShareButtonView bagDetail={bagDetail} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.infoSection}>
            <View style={styles.nameSection}>
              <BagDetailNameView bagDetail={bagDetail} />
            </View>
            <BagDetailDateView bagDetail={bagDetail} />
          </View>

          <BagDetailUselessDescriptionView bagDetail={bagDetail} />
          <BagDetailChartView bagDetail={bagDetail} />

          <View style={styles.separator} />

          <View style={styles.gearHeader}>
            <View style={styles.gearHeaderContent}>
              <Text style={styles.gearCountText}>
                총 {gears.length}개의 장비
              </Text>
            </View>
            <BagDetailFiltersView bagDetail={bagDetail} />
          </View>

          <View style={styles.gearListContainer}>
            <View style={styles.gearList}>
              {bagDetail.getGearsByCategory().map(({ category, gears }) => (
                <BagDetailCategoryView
                  key={category.getFilter()}
                  category={category}
                  bagDetail={bagDetail}
                  gears={gears}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <BagDetailAddButtonView bagDetail={bagDetail} />
      </View>
    );
  }

  return <View style={styles.loading} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: 'white',
    paddingVertical: 4,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  weightText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  infoSection: {
    backgroundColor: 'white',
    paddingTop: 8,
  },
  nameSection: {
    position: 'relative',
  },
  separator: {
    width: '100%',
    backgroundColor: '#F2F4F6',
    minHeight: 10,
  },
  gearHeader: {
    backgroundColor: 'white',
  },
  gearHeaderContent: {
    width: '100%',
    flexDirection: 'row',
    padding: 15,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  gearCountText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  gearListContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  gearList: {
    width: '100%',
    gap: 24,
    paddingBottom: 80,
  },
  loading: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default observer(BagDetailView);
