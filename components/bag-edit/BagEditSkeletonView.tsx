import { FC, useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, FlatList } from 'react-native';

interface Props {}

const BagEditSkeletonView: FC<Props> = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const renderGearSkeletonItem = ({ index }: { index: number }) => {
    return (
      <View key={index} style={styles.gearItemContainer}>
        {/* 좌 정체 컬럼(브랜드·제품명·컬러) — 장비 썸네일이 없어 이미지 자리도 두지 않는다(DataModel §1) */}
        <View style={styles.gearInfoContainer}>
          <Animated.View
            style={[styles.companyPlaceholder, { opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.productPlaceholder, { opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.colorPlaceholder, { opacity: pulseAnim }]}
          />
        </View>

        {/* 우 지표 컬럼 — 무게 */}
        <View style={styles.gearMetricsColumn}>
          <Animated.View
            style={[styles.weightPlaceholder, { opacity: pulseAnim }]}
          />
        </View>

        {/* 체크박스 영역 */}
        <View style={styles.checkboxContainer}>
          <View style={styles.checkboxInner}>
            <Animated.View
              style={[styles.checkboxPlaceholder, { opacity: pulseAnim }]}
            />
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    startPulseAnimation();
  }, []);

  return (
    <View style={styles.container}>
      {/* 상단 고정 헤더 */}
      <View style={styles.fixedHeader}>
        {/* 뒤로가기 버튼 */}
        <View style={styles.backButtonContainer}>
          <Animated.View
            style={[styles.backButtonPlaceholder, { opacity: pulseAnim }]}
          />
        </View>

        <View style={styles.headerContent}>
          {/* FlipCounter 영역 */}
          <View style={styles.flipCounterContainer}>
            <Animated.View
              style={[styles.flipCounterPlaceholder, { opacity: pulseAnim }]}
            />
          </View>

          {/* 내 장비 제목과 추가 버튼 */}
          <View style={styles.titleButtonContainer}>
            <Animated.View
              style={[styles.titlePlaceholder, { opacity: pulseAnim }]}
            />
            <Animated.View
              style={[styles.addButtonPlaceholder, { opacity: pulseAnim }]}
            />
          </View>

          {/* 필터 버튼들 */}
          <View style={styles.filterContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <Animated.View
                key={index}
                style={[styles.filterButtonPlaceholder, { opacity: pulseAnim }]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.mainContent}>
        {/* 상단 헤더 공간 */}
        <View style={styles.headerSpacer} />

        {/* 장비 리스트 */}
        <FlatList
          data={Array.from({ length: 8 }, (_, index) => ({ id: index }))}
          renderItem={({ item }) => renderGearSkeletonItem({ index: item.id })}
          keyExtractor={item => item.id.toString()}
          style={styles.gearList}
          contentContainerStyle={styles.gearListContent}
        />

        {/* 하단 버튼 공간 */}
        <View style={styles.bottomSpacer} />
      </View>

      {/* 하단 고정 버튼 */}
      <View style={styles.fixedBottomButton}>
        <Animated.View
          style={[styles.bottomButtonPlaceholder, { opacity: pulseAnim }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'white',
    minHeight: 204,
  },
  backButtonContainer: {
    alignItems: 'flex-start',
  },
  backButtonPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  headerContent: {
    gap: 19,
    marginTop: 10,
  },
  flipCounterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
  },
  flipCounterPlaceholder: {
    width: 200,
    height: 50,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  titlePlaceholder: {
    width: 80,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  addButtonPlaceholder: {
    width: 100,
    height: 40,
    backgroundColor: '#E5E7EB',
    borderRadius: 26,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  filterButtonPlaceholder: {
    width: 80,
    height: 32,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
  },
  mainContent: {
    flex: 1,
  },
  headerSpacer: {
    height: 204,
  },
  gearList: {
    paddingHorizontal: 20,
  },
  gearListContent: {
    paddingBottom: 100,
  },
  bottomSpacer: {
    height: 72,
  },
  fixedBottomButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  bottomButtonPlaceholder: {
    width: '100%',
    height: 48,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
  },
  gearItemContainer: {
    flexDirection: 'row',
    // GearView의 실제 행과 동일한 세로 여백(14).
    paddingVertical: 14,
    gap: 12,
    alignItems: 'center',
  },
  // 좌 정체 컬럼 — 브랜드·제품명·컬러 바 스택.
  gearInfoContainer: {
    flex: 1,
    gap: 7,
    overflow: 'hidden',
  },
  // 우 지표 컬럼 — 무게 바(우측 정렬).
  gearMetricsColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  // 브랜드는 이름과 동일한 타이포라 바 높이도 productPlaceholder와 같게 둔다.
  companyPlaceholder: {
    height: 14,
    width: 60,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  productPlaceholder: {
    height: 14,
    width: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  colorPlaceholder: {
    height: 14,
    width: 80,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  weightPlaceholder: {
    height: 14,
    width: 50,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  checkboxContainer: {
    minWidth: 40,
    height: 80,
  },
  checkboxInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  checkboxPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
});

export default BagEditSkeletonView;
