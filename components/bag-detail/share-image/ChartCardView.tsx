import React, { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import Gear from '@/model/gear/Gear';
import {
  CHART_COLORS,
  DARK_TEXT_MAIN,
  DARK_TEXT_SUB,
  CATEGORY_NAME_MAP,
} from './constants';

interface Props {
  width: number;
  height: number;
  categories: Array<{
    category: WarehouseFilter;
    gears: Gear[];
  }>;
  totalWeightNum: number;
  bagName: string;
}

const ChartCardView: FC<Props> = ({
  width,
  height,
  categories,
  totalWeightNum,
  bagName,
}) => {
  const chartSize = Math.min(width, height) * 0.6;
  const radius = chartSize / 2;
  const innerRadius = radius * 0.6;
  let startAngle = -90;

  const slices = categories.map((cat, idx) => {
    const weight = cat.gears.reduce(
      (s, g) => s + Number(g.getWeight() || 0),
      0
    );
    const percentage = totalWeightNum > 0 ? weight / totalWeightNum : 0;
    const angle = percentage * 360;
    const endAngle = startAngle + angle;

    const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
    const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);
    const x2 = radius + radius * Math.cos((Math.PI * endAngle) / 180);
    const y2 = radius + radius * Math.sin((Math.PI * endAngle) / 180);

    const largeArc = angle > 180 ? 1 : 0;
    const pathData = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const color = CHART_COLORS[idx % CHART_COLORS.length];
    startAngle = endAngle;

    return { path: pathData, color, percentage, category: cat };
  });

  return (
    <View
      style={[
        styles.cardBase,
        {
          width,
          height,
          flexDirection: 'row',
          padding: 24,
          alignItems: 'center',
          backgroundColor: '#1A1A1A',
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
      ]}
    >
      {/* Chart */}
      <View style={{ width: chartSize, height: chartSize }}>
        <Svg width={chartSize} height={chartSize}>
          {slices.map((slice, i) => (
            <Path key={i} d={slice.path} fill={slice.color} />
          ))}
          <Circle cx={radius} cy={radius} r={innerRadius} fill='#1A1A1A' />
        </Svg>
        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: DARK_TEXT_MAIN,
              fontFamily: 'Inter_700Bold',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            {bagName}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={{ flex: 1, paddingLeft: 24, gap: 8 }}>
        {slices.slice(0, 5).map((slice, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: slice.color,
                }}
              />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: DARK_TEXT_MAIN,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                {CATEGORY_NAME_MAP[slice.category.category.getFilter()] ||
                  slice.category.category.getName()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: DARK_TEXT_MAIN,
                  fontFamily: 'Inter_700Bold',
                }}
              >
                {slice.category.gears.reduce(
                  (s, g) => s + Number(g.getWeight() || 0),
                  0
                ) >= 1000
                  ? (
                      slice.category.gears.reduce(
                        (s, g) => s + Number(g.getWeight() || 0),
                        0
                      ) / 1000
                    ).toFixed(2) + 'kg'
                  : slice.category.gears.reduce(
                      (s, g) => s + Number(g.getWeight() || 0),
                      0
                    ) + 'g'}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: DARK_TEXT_SUB,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {(slice.percentage * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 30,
    overflow: 'hidden',
  },
});

export default ChartCardView;
