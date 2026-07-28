import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import { Color } from '@/constants/DesignTokens';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';

interface Props {
  gear: Gear;
}

// GD-1 기본 정보 섹션. 장비 이미지는 표시하지 않으며(DataModel §1 장비 이미지 미제공 원칙)
// 빈 이미지 칸·플레이스홀더도 두지 않는다 — 처음부터 이미지 칸이 없는 텍스트 우선 레이아웃이고,
// 화면의 시각 앵커는 무게 히어로가 담당한다.
const WarehouseDetailInformationView: FC<Props> = ({ gear }) => {
  // 한글 표시명 우선 — 창고/검색 리스트와 동일한 이름으로 보이게 한다(GD-1).
  const company = gear.getDisplayCompany();
  const name = gear.getDisplayName();
  const weight = gear.getWeight();
  const color = gear.getDisplayColor();
  const size = gear.getDisplaySize();
  const category = gear.getCategory();
  // 세분 카테고리 한글 라벨 우선, 매핑에 없으면 그룹(GearFilter) 라벨 폴백(GD-1, DM-4). 카테고리 없으면 항목 생략.
  const categoryLabel = category
    ? gear.getFineCategoryLabel() || GEAR_FILTER_NAMES[gear.getGroupCategory()]
    : '';
  // 카테고리 · 색상 · 사이즈 메타 라인 — 빈 항목 생략, 모두 없으면 라인 미노출
  const metaLine = [categoryLabel, color, size].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.productInfo}>
        <PretendardText style={styles.companyText}>{company}</PretendardText>
        <PretendardText
          weight='bold'
          style={styles.nameText}
          lineBreakStrategyIOS='hangul-word'
        >
          {name}
        </PretendardText>
        {metaLine ? (
          <PretendardText style={styles.metaText}>{metaLine}</PretendardText>
        ) : null}
      </View>
      {weight ? (
        <View style={styles.weightHero}>
          <PretendardText style={styles.weightCaption}>무게</PretendardText>
          <PretendardText weight='bold' style={styles.weightText}>
            {weight}g
          </PretendardText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  productInfo: {
    flexDirection: 'column',
  },
  companyText: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  nameText: {
    fontSize: 24,
    lineHeight: 32,
    color: Color.textPrimary,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: Color.textSecondary,
    marginTop: 6,
  },
  // 무게 히어로 — 이미지가 하던 시각 위계를 대신하는 화면의 앵커(GD-1).
  weightHero: {
    flexDirection: 'column',
  },
  weightCaption: {
    fontSize: 12,
    color: Color.textSecondary,
    marginBottom: 2,
  },
  weightText: {
    fontSize: 40,
    lineHeight: 48,
    color: Color.textPrimary,
  },
});

export default observer(WarehouseDetailInformationView);
