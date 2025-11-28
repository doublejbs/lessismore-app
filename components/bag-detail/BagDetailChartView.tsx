import { observer } from 'mobx-react-lite';
import { FC, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';

interface Bag {
  getGears: () => Gear[];
}

interface Props {
  bagDetail: Bag;
}

const BagDetailChartView: FC<Props> = ({ bagDetail }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 애니메이션 시작
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 카테고리 이름 매핑 함수
  const getCategoryName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      [GearFilter.Backpack]: '배낭',
      [GearFilter.Tent]: '텐트',
      [GearFilter.SleepingBag]: '침낭',
      [GearFilter.Mat]: '매트',
      [GearFilter.Lantern]: '랜턴',
      [GearFilter.Cooking]: '조리',
      [GearFilter.Clothing]: '의류',
      [GearFilter.Furniture]: '가구',
      [GearFilter.Electronic]: '전자기기',
      [GearFilter.Food]: '음식',
      [GearFilter.Etc]: '기타',
    };
    return categoryMap[category] || category;
  };

  // 카테고리별 데이터 계산
  const getCategoryData = () => {
    const gears = bagDetail.getGears();
    const categoryMap = new Map<string, { count: number; weight: number }>();
    let totalWeight = 0;

    gears.forEach(gear => {
      const gearFilterCategory = gear.getCategory() || GearFilter.Etc;
      const weight = Number(gear.getWeight());

      // 텐트, 침낭, 매트, 배낭을 베이스로 분류
      let category = gearFilterCategory;
      if (
        gearFilterCategory === GearFilter.Tent ||
        gearFilterCategory === GearFilter.SleepingBag ||
        gearFilterCategory === GearFilter.Mat ||
        gearFilterCategory === GearFilter.Backpack
      ) {
        category = '베이스(배낭, 텐트, 침낭, 매트)';
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, weight: 0 });
      }
      const data = categoryMap.get(category)!;
      data.count += 1;
      data.weight += weight;
      totalWeight += weight;
    });

    // 모든 카테고리 데이터 생성 후 퍼센트 내림차순 정렬
    const sortedData = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        weight: data.weight,
        percentage: totalWeight > 0 ? (data.weight / totalWeight) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return sortedData;
  };

  const categoryData = getCategoryData();
  const hasData = categoryData.length > 0;

  // 카테고리별 색상 정의
  const getColorForCategory = (index: number) => {
    const colors = [
      '#4A90E2',
      '#50C878',
      '#FFD700',
      '#FF6B6B',
      '#9B59B6',
      '#FF8C00',
      '#20B2AA',
      '#FF69B4',
    ];
    return colors[index % colors.length];
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.headerTitle}>📊 카테고리별 무게</Text>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color='#191F28'
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <>
          {hasData ? (
            <>
              {/* 스택 바 차트 */}
              <View style={styles.chartContainer}>
                {categoryData.map((item, index) => {
                  const isFirst = index === 0;
                  const isLast = index === categoryData.length - 1;
                  const isHighlighted = highlightedIndex === index;
                  const displayWidth = item.percentage;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.chartBar,
                        {
                          width: isAnimated ? `${displayWidth}%` : '0%',
                          backgroundColor: getColorForCategory(index),
                          borderTopLeftRadius: isFirst ? 8 : 0,
                          borderBottomLeftRadius: isFirst ? 8 : 0,
                          borderTopRightRadius: isLast ? 8 : 0,
                          borderBottomRightRadius: isLast ? 8 : 0,
                          minWidth: isAnimated ? 4 : 0,
                          transform: [{ scaleY: isHighlighted ? 1.15 : 1 }],
                          zIndex: isHighlighted ? 10 : 1,
                        },
                      ]}
                      onPress={() => {
                        setHighlightedIndex(
                          highlightedIndex === index ? null : index
                        );
                      }}
                    />
                  );
                })}
              </View>

              {/* 범례 */}
              <View style={styles.legendContainer}>
                {categoryData.map((item, index) => {
                  const isDimmed =
                    highlightedIndex !== null && highlightedIndex !== index;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.legendItem,
                        {
                          opacity: isAnimated ? (isDimmed ? 0.4 : 1) : 0,
                        },
                      ]}
                      onPress={() => {
                        setHighlightedIndex(
                          highlightedIndex === index ? null : index
                        );
                      }}
                    >
                      {/* 왼쪽: 색상 표시자 + 카테고리 이름과 퍼센트 */}
                      <View style={styles.legendLeft}>
                        <View
                          style={[
                            styles.colorIndicator,
                            { backgroundColor: getColorForCategory(index) },
                          ]}
                        />
                        <View>
                          <Text style={styles.categoryName}>
                            {getCategoryName(item.category)}
                          </Text>
                          <Text style={styles.categoryPercentage}>
                            {item.percentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>

                      {/* 오른쪽: 무게 */}
                      <Text style={styles.weightText}>
                        {item.weight.toFixed(0)}g
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            // 데이터가 없을 때 메시지
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>장비를 추가해주세요</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    padding: 8,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 17,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  chartBar: {
    height: '100%',
    position: 'relative',
  },
  legendContainer: {
    gap: 8,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  categoryName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#374151',
  },
  categoryPercentage: {
    color: '#6B7280',
    fontSize: 14,
  },
  weightText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  emptyContainer: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default observer(BagDetailChartView);
