import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '../../model/gear/Gear';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Acg, AcgType } from '@/constants/DesignTokens';
import {
  formatSpecValue,
  getSpecsSchemaFor,
} from '@/model/gear/GearSpecsSchema';
import app from '@/model/app/App';

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

  const getLabel = (key: string) =>
    schema[key]
      ? app.getL10n().t(`gearDetail.specLabels.${schema[key].label}`)
      : key;

  const getValue = (key: string) => {
    const value = specs[key];
    const def = schema[key];

    if (def?.type === 'boolean') {
      return app
        .getL10n()
        .t(value ? 'gearDetail.specBooleanTrue' : 'gearDetail.specBooleanFalse');
    }

    if (def?.unit === 'person') {
      return `${value}${app.getL10n().t('gearDetail.personUnit')}`;
    }

    if (def?.type === 'enum') {
      return app
        .getL10n()
        .t(`gearDetail.specEnums.${String(value)}`, {
          defaultValue: formatSpecValue(key, value, schema),
        });
    }

    return formatSpecValue(key, value, schema);
  };

  // 스키마 정의 순서대로 먼저, 그 뒤 스키마에 없는 미지 키(라벨=키명, 값=문자열화).
  const schemaRows: SpecRow[] = Object.keys(schema)
    .filter(key => key in specs)
    .map(key => ({
      key,
      label: getLabel(key),
      value: getValue(key),
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
    <WarehouseDetailSectionView title={app.getL10n().t('gearDetail.specs')}>
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
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  table: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  label: {
    width: 100,
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  value: {
    flex: 1,
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default observer(WarehouseDetailSpecsView);
