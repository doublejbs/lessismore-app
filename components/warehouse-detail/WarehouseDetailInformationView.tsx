import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import { Color, Spacing } from '@/constants/DesignTokens';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';

interface Props {
  gear: Gear;
  // 사용자가 올린 본인 사진 슬롯(GD-13). 사진이 있는지는 업로드 상태를 가진 상위
  // (WarehouseDetailBasicInfoView)만 알 수 있어 노드로 받는다. 없으면 1열이다.
  photo?: ReactNode;
}

// GD-1 기본 정보 섹션. 카탈로그 크롤 이미지는 쓰지 않고(DataModel §1) 사용자가 올린 본인 사진만
// `photo` 슬롯으로 받는다.
// - 사진이 있으면 좌우 2열(좌: 100pt 정사각 사진 / 우: 브랜드 → 이름 → 메타 → **무게**). 사진을
//   위에 두고 정체 정보를 아래로 쌓으면 393pt 폭에서 우측 250pt 이상이 빈 채로 남아 핵심 지표가
//   밀린다. 2열을 만들고 무게만 그 아래 전체 폭에 남기면 상단이 「사진+정보」와 「무게」 두 덩어리로
//   갈라져 세로로 늘어지므로(사진을 줄여 확보한 공간을 여백이 도로 먹는다) 무게도 우측 컬럼에 넣는다.
// - 사진이 없으면 빈 칸·플레이스홀더 없는 텍스트 우선 1열 + 무게 히어로(40pt + 캡션) 그대로다
//   (이미지 없는 장비가 다수라 이쪽이 기본 모습이다).
// 어느 쪽이든 화면의 시각 앵커는 무게다 — 그래서 사진을 140pt가 아닌 100pt로 둔다.
const WarehouseDetailInformationView: FC<Props> = ({ gear, photo }) => {
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
  const hasPhoto = Boolean(photo);
  // 2열에서는 우측 컬럼이 좁아 긴 브랜드·이름이 여러 줄로 흘러 사진 옆 균형을 깬다 — 말줄임한다(GD-1).
  // 1열에서는 지금처럼 전체 폭을 다 쓰며 자유롭게 줄바꿈한다(제한 없음).
  const singleLine = hasPhoto ? 1 : undefined;
  const nameLines = hasPhoto ? 2 : undefined;
  // 2열의 무게 — 우측 컬럼 폭이 좁아 40pt가 들어가지 않으므로 28pt로 낮추고 `무게` 캡션은
  // 생략한다(`g` 단위가 이미 무엇인지 말해준다). 낮춰도 컬럼에서 가장 큰 활자라 앵커는 유지된다(GD-1).
  const columnWeight =
    hasPhoto && weight ? (
      <PretendardText weight='bold' style={styles.weightColumnText}>
        {weight}g
      </PretendardText>
    ) : null;
  const identity = (
    <View style={[styles.productInfo, hasPhoto && styles.identityColumn]}>
      <PretendardText
        style={styles.companyText}
        weight='bold'
        numberOfLines={singleLine}
      >
        {company}
      </PretendardText>
      <PretendardText
        weight='bold'
        style={styles.nameText}
        lineBreakStrategyIOS='hangul-word'
        numberOfLines={nameLines}
      >
        {name}
      </PretendardText>
      {metaLine ? (
        <PretendardText style={styles.metaText} numberOfLines={singleLine}>
          {metaLine}
        </PretendardText>
      ) : null}
      {columnWeight}
    </View>
  );

  if (hasPhoto) {
    // 상단 전체가 사진 높이 한 덩어리로 수렴한다 — 아래에 무게 블록이 따로 없으므로
    // 1열용 세로 간격(stackedContainer)도 두지 않는다(GD-1).
    return (
      <View style={styles.container}>
        <View style={styles.identityRow}>
          {photo}
          {identity}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.stackedContainer]}>
      {identity}
      {/* 사진이 없으면 무게가 화면의 유일한 앵커라 40pt + `무게` 캡션 히어로를 그대로 쓴다(GD-1). */}
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
    marginBottom: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  // 1열(사진 없음)에서만 정보 블록과 무게 히어로 사이를 벌린다 — 2열에서는 무게가 우측 컬럼
  // 안으로 들어가 이 간격이 목적을 잃고 상단만 늘어뜨린다(GD-1).
  stackedContainer: {
    gap: Spacing.section,
  },
  productInfo: {
    flexDirection: 'column',
  },
  // GD-1 2열: 좌측 사진 + 우측 정체 정보. 사진 상단과 브랜드 첫 줄을 맞춘다.
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.item,
  },
  identityColumn: {
    flex: 1,
    // 긴 이름이 컬럼을 밀어내 사진을 침범하지 않도록 최소 폭을 0으로 둔다(GD-1).
    minWidth: 0,
  },
  // GD-1: 브랜드는 제품명(nameText)과 동일한 타이포로 표시한다.
  companyText: {
    fontSize: 24,
    lineHeight: 32,
    color: Color.textPrimary,
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
  // 2열 우측 컬럼의 무게 — 메타 라인과 같은 간격으로 붙여 컬럼을 한 덩어리로 유지한다(GD-1).
  weightColumnText: {
    fontSize: 28,
    lineHeight: 36,
    color: Color.textPrimary,
    marginTop: 6,
  },
  // 무게 히어로(1열) — 이미지가 하던 시각 위계를 대신하는 화면의 앵커(GD-1).
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
