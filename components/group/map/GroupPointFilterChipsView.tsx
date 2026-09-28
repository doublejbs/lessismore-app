import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPointType from '@/model/group/GroupPointType';
import GroupPointList from '@/model/group-point/GroupPointList';
import {
  GROUP_POINT_TYPES,
  getGroupPointTypeColor,
  getGroupPointTypeLabel,
} from '@/model/group-point/GroupPointLabels';

interface Props {
  pointList: GroupPointList;
  // 지도 위에 얹을 때는 불투명 종이 면 톤을 쓴다 — 연회색 칩은 지도 라벨과 겹쳐 읽힌다.
  onMap?: boolean;
}

/**
 * 포인트 유형 필터 (GRP-10). 무필터인 `전체`를 맨 앞에 두고 유형 4종을 잇는다 —
 * 필터 해제 수단이 항상 첫 자리에 있어야 찾기 쉽다(박지 지도 CS-2와 같은 문법).
 * 칩의 색 도트가 지도 마커 색 범례를 겸한다.
 */
const GroupPointFilterChipsView: FC<Props> = ({ pointList, onMap = false }) => {
  const l10n = app.getL10n();
  const selectedType = pointList.getSelectedType();

  const handlePress = (type: GroupPointType | null) => {
    pointList.selectType(type);
  };

  return (
    <View style={styles.row}>
      <CategoryChipView
        label={l10n.t('common.all')}
        tone={onMap ? 'acgSolid' : 'default'}
        selected={selectedType === null}
        onPress={() => handlePress(null)}
      />
      {GROUP_POINT_TYPES.map(type => (
        <CategoryChipView
          key={type}
          label={getGroupPointTypeLabel(type)}
          tone={onMap ? 'acgSolid' : 'default'}
          dotColor={getGroupPointTypeColor(type)}
          selected={selectedType === type}
          onPress={() => handlePress(type)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: AcgLayout.chipGap,
  },
});

export default observer(GroupPointFilterChipsView);
