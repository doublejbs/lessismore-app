import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '../../model/gear/Gear';
import PretendardText from '../PretendardText';
import { Acg, AcgLayout, AcgShadow } from '@/constants/DesignTokens';
import {
  formatSpecValue,
  getSpecsSchemaFor,
} from '@/model/gear/GearSpecsSchema';

interface Props {
  gear: Gear;
}

interface SpecRow {
  key: string;
  label: string;
  value: string;
}

// 카테고리별 스펙 표(GD-8) — specs에 값이 있는 필드만 `라벨 : 값` 2열로 표시한다.
const WarehouseDetailSpecsView: FC<Props> = ({ gear }) => {
  const specs = gear.getSpecs();
  const schema = getSpecsSchemaFor(gear.getCategory());

  // 스키마 정의 순서대로 먼저, 그 뒤 스키마에 없는 미지 키(라벨=키명, 값=문자열화).
  const schemaRows: SpecRow[] = Object.keys(schema)
    .filter(key => key in specs)
    .map(key => ({
      key,
      label: schema[key].label,
      value: formatSpecValue(key, specs[key], schema),
    }))
    .filter(row => row.value !== '');

  const unknownRows: SpecRow[] = Object.keys(specs)
    .filter(key => !(key in schema))
    .map(key => ({
      key,
      label: key,
      value: formatSpecValue(key, specs[key], schema),
    }))
    .filter(row => row.value !== '');

  const rows = [...schemaRows, ...unknownRows];

  // specs가 없거나 전부 비면 섹션 자체를 렌더하지 않는다(레거시·커스텀 장비 호환).
  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
        <PretendardText weight='semibold' style={styles.title}>
          스펙
        </PretendardText>
        <View style={styles.table}>
          {rows.map((row, index) => (
            <View
              key={row.key}
              style={[styles.row, index > 0 && styles.rowDivider]}
            >
              <PretendardText style={styles.label}>{row.label}</PretendardText>
              <PretendardText style={styles.value}>{row.value}</PretendardText>
            </View>
          ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 섹션은 지면 위에 얹은 종이 면이다(ACG). 예전에는 흰 배경 위에서 10px 회색 띠로
  // 섹션을 갈랐는데, 지면이 생기면서 띠가 아니라 면의 경계가 구분을 맡는다.
  container: {
    flexDirection: 'column',
    marginHorizontal: AcgLayout.screenH,
    marginBottom: 12,
    padding: 16,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  title: {
    fontSize: 17,
    color: Acg.ink,
  },
  table: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.line2,
  },
  label: {
    width: 100,
    fontSize: 14,
    color: Acg.textSecondary,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: Acg.ink,
  },
});

export default observer(WarehouseDetailSpecsView);
