import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '../../model/gear/Gear';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Liquid, LiquidType } from '@/constants/DesignTokens';
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

// 라벨 컬럼 고정 폭(목업 §9) — 값의 왼쪽 선이 모든 행에서 같아야 표로 읽힌다.
const LABEL_WIDTH = 96;

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
    <WarehouseDetailSectionView title='스펙'>
      {rows.map((row, index) => (
        <View key={row.key}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <PretendardText style={styles.label}>{row.label}</PretendardText>
            <PretendardText weight='medium' style={styles.value}>
              {row.value}
            </PretendardText>
          </View>
        </View>
      ))}
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    gap: 12,
  },
  // 카드 안쪽 여백을 그대로 가로지른다 — 스펙 표는 라벨 컬럼이 이미 왼쪽 선을 만들어,
  // 목록 행처럼 구분선을 들여쓰면 표가 두 덩어리로 갈려 보인다(목업 §9).
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
  label: {
    width: LABEL_WIDTH,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkMuted,
  },
  value: {
    flex: 1,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.ink,
  },
});

export default observer(WarehouseDetailSpecsView);
