import { observer } from 'mobx-react-lite';
import { FC, useCallback, useLayoutEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Spacing } from '@/constants/DesignTokens';
import BagDetailCategoryView from './BagDetailCategoryView';
import BagDetailDateView from './BagDetailDateView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetailNameView from './BagDetailNameView';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import BagDetailSummaryView from './BagDetailSummaryView';
import BagDetailBottomBar from './BagDetailBottomBar';
import BagDetailMemoView from './BagDetailMemoView';
import BagDetailDestinationView from './BagDetailDestinationView';
import BagDetailActivityView from './BagDetailActivityView';
import ShareButtonView from './ShareButtonView';
import BagDetailCopyView from '../bag/BagDetailCopyView';
import { useFocusEffect } from 'expo-router';
import BagDetailSkeletonView from './BagDetailSkeletonView';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import ToastView from '../toast/ToastView';
import app from '@/model/app/App';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailView: FC<Props> = ({ bagDetail }) => {
  const initialized = bagDetail.isInitialized();
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefsMap = useRef<Map<string, any>>(new Map());

  const handlePressBack = () => {
    bagDetail.back();
  };

  const handleCategoryRefReady = (categoryFilter: string, ref: any) => {
    categoryRefsMap.current.set(categoryFilter, ref);
    bagDetail.setCategoryRefs(categoryRefsMap.current);
  };

  const handleScroll = (event: any) => {
    bagDetail.handleScroll(event);
  };

  useFocusEffect(
    useCallback(() => {
      bagDetail.initialize();
    }, [bagDetail])
  );

  useLayoutEffect(() => {
    if (initialized && scrollViewRef.current) {
      bagDetail.setScrollViewRef(scrollViewRef.current);
    }
  }, [initialized]);

  if (initialized) {
    const gears = bagDetail.getGears();

    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={handlePressBack}
                  hitSlop={12}
                  accessibilityRole='button'
                  accessibilityLabel='뒤로가기'
                >
                  <Ionicons
                    name='chevron-back'
                    size={24}
                    color={Color.textPrimary}
                  />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                  <BagDetailCopyView
                    sourceId={bagDetail.getId()}
                    sourceName={bagDetail.getName()}
                  />
                  <ShareButtonView bagDetail={bagDetail} />
                </View>
              </View>
            </View>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              stickyHeaderIndices={[4]}
              onScroll={handleScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.infoSection}>
                <BagDetailNameView bagDetail={bagDetail} />
                <BagDetailDateView bagDetail={bagDetail} />
              </View>
              <BagDetailSummaryView bagDetail={bagDetail} />
              <View style={styles.actionsGrid}>
                {bagDetail.getTripPhase() === 'after' ? (
                  <>
                    <BagDetailUselessDescriptionView
                      bagDetail={bagDetail}
                      emphasized
                    />
                    <BagDetailMemoView bagDetail={bagDetail} />
                    <BagDetailDestinationView bagDetail={bagDetail} />
                    <BagDetailActivityView bagDetail={bagDetail} />
                  </>
                ) : (
                  <>
                    <BagDetailDestinationView bagDetail={bagDetail} emphasized />
                    <BagDetailMemoView bagDetail={bagDetail} />
                    <BagDetailUselessDescriptionView bagDetail={bagDetail} />
                    <BagDetailActivityView bagDetail={bagDetail} />
                  </>
                )}
              </View>
              <View style={styles.separator} />
              <View
                style={styles.gearHeader}
                onLayout={e =>
                  bagDetail.setGearHeaderHeight(e.nativeEvent.layout.height)
                }
              >
                <View style={styles.gearHeaderContent}>
                  <PretendardText style={styles.gearCountText} weight='bold'>
                    총 {gears.length}개의 장비
                  </PretendardText>
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
                      onRefReady={handleCategoryRefReady}
                    />
                  ))}
                  <View style={styles.dummy} />
                </View>
              </View>
            </ScrollView>
            <BagDetailBottomBar bagDetail={bagDetail} />
          </View>
          <ToastView toastManager={app.getToastManager()!} bottom={100} />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  } else {
    return <BagDetailSkeletonView />;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    backgroundColor: Color.background,
    marginBottom: 8,
    paddingHorizontal: Spacing.screenH,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  infoSection: {
    backgroundColor: Color.background,
    paddingTop: 8,
    paddingHorizontal: Spacing.screenH,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    paddingHorizontal: Spacing.screenH,
    marginTop: 12,
    marginBottom: 8,
  },
  separator: {
    width: '100%',
    backgroundColor: Color.divider,
    minHeight: 10,
  },
  gearHeader: {
    backgroundColor: Color.background,
  },
  gearHeaderContent: {
    width: '100%',
    flexDirection: 'row',
    padding: Spacing.screenH,
    justifyContent: 'space-between',
  },
  gearCountText: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  gearListContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
  },
  gearList: {
    width: '100%',
    gap: 24,
    paddingBottom: 80,
  },
  dummy: {
    height: 200,
  },
});

export default observer(BagDetailView);
