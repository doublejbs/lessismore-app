import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import {
  POINT_TYPES,
  getPointTypeColor,
  getPointTypeLabel,
} from '@/model/point/PointLabels';
import PointType from '@/model/point/PointType';

interface Props {
  // 지금 걸린 유형. `null`이면 `전체`다.
  selectedType: PointType | null;
  onSelectType: (type: PointType | null) => void;
  // 지도 위에 얹을 때는 불투명 종이 면 톤을 쓴다 — 연회색 칩은 지도 라벨과 겹쳐 읽힌다.
  onMap?: boolean;
}

/**
 * 포인트 유형 필터 (GRP-10 · BD-14). 그룹 지도와 배낭 코스 화면이 함께 쓴다.
 * 무필터인 `전체`를 맨 앞에 두고 유형 4종을 잇는다 — 필터 해제 수단이 항상 첫 자리에 있어야
 * 찾기 쉽다(박지 지도 CS-2와 같은 문법). 칩의 색 도트가 지도 마커 색 범례를 겸한다.
 * 모델을 모른다 — 선택 값과 콜백만 받는다(그룹 `GroupPointList`, 배낭 `BagPointList`).
 */
const PointFilterChipsView: FC<Props> = ({
  selectedType,
  onSelectType,
  onMap = false,
}) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.row}>
      <CategoryChipView
        label={l10n.t('common.all')}
        tone={onMap ? 'acgSolid' : 'default'}
        selected={selectedType === null}
        onPress={() => onSelectType(null)}
      />
      {POINT_TYPES.map(type => (
        <CategoryChipView
          key={type}
          label={getPointTypeLabel(type)}
          tone={onMap ? 'acgSolid' : 'default'}
          dotColor={getPointTypeColor(type)}
          selected={selectedType === type}
          onPress={() => onSelectType(type)}
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

export default PointFilterChipsView;
