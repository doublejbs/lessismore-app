import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import LiquidChip from '@/components/liquid/LiquidChip';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidType,
} from '@/constants/DesignTokens';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';
import { formatGearWeightValue, hasWeight } from '@/model/gear/WeightFormat';

interface Props {
  gear: Gear;
  // 사용자가 올린 본인 사진 슬롯(GD-13). 사진이 있는지는 업로드 상태를 가진 상위
  // (WarehouseDetailBasicInfoView)만 알 수 있어 노드로 받는다. 없으면 사진 줄을 그리지 않는다.
  photo?: ReactNode;
}

// GD-1 기본 정보 섹션 — **사진 줄 + 정체 줄** 두 층 구성(2026-07-29 사용자 결정).
// - 1층(사진): 140pt 정사각을 **가운데 단독 줄**로 둔다. 카탈로그 크롤 이미지는 쓰지 않고
//   (DataModel §1) 사용자가 올린 본인 사진만 `photo` 슬롯으로 받는다. 사진이 없으면 **이 줄 자체를
//   렌더하지 않는다** — 빈 칸·플레이스홀더를 남기지 않는다(이미지 없는 장비가 다수라 그게 기본 모습).
// - 2층(정체): 브랜드 → 이름 위로 쌓고, 그 아래 **태그 칩 줄 + 우측 무게**를 한 행에 둔다
//   (Liquid Depth, 목업 §9). 무게가 우측 같은 자리에 오는 앱 전역 문법(창고 WH-1·배낭 BAG-1)은
//   그대로이고, 카테고리·색상·사이즈만 메타 텍스트에서 **칩**으로 바뀌었다 — 화면 대상(이름)이
//   28pt로 커지면서 그 아래 회색 한 줄은 이름에 딸린 부제처럼 읽혔다.
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
  // 카테고리 · 색상 · 사이즈 태그 — 빈 항목은 생략하고, 모두 없으면 칩 줄이 비어 있게 둔다.
  const tags = [categoryLabel, color, size].filter(Boolean);

  return (
    <View style={styles.container}>
      {photo ? <View style={styles.photoRow}>{photo}</View> : null}

      {/* 값이 없으면 줄 자체를 렌더하지 않는다(GD-1) — 빈 텍스트를 두면 죽은 공백이 생겨
          이름이 아래로 밀린다. 태그 줄과 같은 규칙. */}
      {company ? (
        <PretendardText
          weight='semibold'
          style={styles.companyText}
          numberOfLines={1}
        >
          {company}
        </PretendardText>
      ) : null}
      <PretendardText
        weight='bold'
        style={styles.nameText}
        lineBreakStrategyIOS='hangul-word'
        numberOfLines={2}
      >
        {name}
      </PretendardText>

      {/* 태그 줄과 무게는 **글자 아랫선을 맞춘다**(flex-end) — 칩 줄이 두 줄로 늘어나도
          무게가 마지막 줄과 나란히 앉아 두 정보가 한 행으로 읽힌다. */}
      <View style={styles.metaRow}>
        <View style={styles.tags}>
          {/* 세 값이 서로 다른 축이라 같은 문자열이 겹칠 수 있다(색상 `블랙` · 사이즈 `블랙`
              같은 데이터가 실제로 있다) — 라벨만으로 키를 만들면 중복 키가 된다. */}
          {tags.map((tag, index) => (
            <LiquidChip key={`${index}-${tag}`} label={tag} size='sm' />
          ))}
        </View>

        {/* 무게는 우측 정렬, `무게` 캡션은 생략한다 — `g` 단위가 이미 무엇인지 말해주고
            목록 행에도 캡션이 없다. 캡션 없이도 화면에서 가장 큰 숫자라 시각 앵커는 무게다(GD-1).
            콘덴스드는 한글 글리프가 없어 숫자·단위에만 쓴다. */}
        {hasWeight(weight) ? (
          <PretendardText style={styles.weightText} numberOfLines={1}>
            {formatGearWeightValue(weight)}
            <PretendardText style={styles.weightUnit}>g</PretendardText>
          </PretendardText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingTop: 14,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 1층 — 사진은 가운데 단독 줄(GD-1).
  photoRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  // 브랜드는 이름을 여는 라벨이다 — 이름과 같은 크기로 두던 ACG 문법과 달리 한 단계 낮춘다.
  companyText: {
    fontSize: 13,
    lineHeight: 18,
    color: Liquid.inkMuted,
  },
  nameText: {
    marginTop: 4,
    fontSize: LiquidType.title2.fontSize,
    lineHeight: LiquidType.title2.lineHeight,
    letterSpacing: LiquidType.title2.letterSpacing,
    color: Liquid.ink,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  tags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // 고정 폭이 아니라 콘텐츠 폭이되 줄어들거나 줄바꿈되지 않게 한다(GD-1).
  weightText: {
    flexShrink: 0,
    fontFamily: LiquidFont.condensed,
    fontSize: LiquidType.numXl.fontSize,
    lineHeight: LiquidType.numXl.lineHeight,
    letterSpacing: LiquidType.numXl.letterSpacing,
    textAlign: 'right',
    color: Liquid.ink,
  },
  // 단위는 값보다 작고 낮다. 부모 라인박스 안에 중첩하므로 행간은 부모가 정한다.
  weightUnit: {
    fontFamily: LiquidFont.condensed,
    fontSize: 18,
    color: Liquid.inkMuted,
  },
});

export default observer(WarehouseDetailInformationView);
