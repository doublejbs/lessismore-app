import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import LiquidChip from '@/components/liquid/LiquidChip';
import WarehouseDetailImagePreviewView from './WarehouseDetailImagePreviewView';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidType,
} from '@/constants/DesignTokens';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';
import { formatGearWeight, hasWeight } from '@/model/gear/WeightFormat';

interface Props {
  gear: Gear;
}

// GD-1 기본 정보 섹션 — **사진 줄 + 정체 줄** 두 층 구성(2026-07-29 사용자 결정).
// - 1층(사진): 140pt 정사각을 **가운데 단독 줄**로 둔다. 카탈로그 크롤 이미지는 쓰지 않고
//   (DataModel §1) 사용자가 올린 본인 사진(`Gear.getImageUrl()`)만 그린다. 사진이 없으면
//   **이 줄 자체를 렌더하지 않는다** — 빈 칸·플레이스홀더·`사진 추가` 점선 박스를 두지 않는다.
//   이 앱은 장비 이미지를 취급하지 않기로 한 제품이라 사진 없는 장비가 기본 모습이고,
//   비어 있을 자리를 화면에서 가장 큰 요소로 두면 대다수 사용자에게 영구히 빈 칸이 된다
//   (2026-08-11 디자인 리뷰). 사진을 올리는 경로는 `수정` 안에 있다(GD-13).
// - 2층(정체): 브랜드 → 이름 → **무게** → 태그 칩 순으로 쌓는다(2026-08-11 디자인 리뷰).
//   무게는 이 화면의 핵심 수치이자 시각 앵커라 이름 바로 아래 **독립 줄**에 좌측 정렬로 둔다 —
//   태그 칩 줄 우측에 매달려 있을 때는 칩 줄에도 속하지 않고 아래 블록에 붙어 보여 소속이 없었고,
//   단위 `g`를 작게 앉히니 아래첨자처럼 매달려 더 불안정했다. 이제 숫자와 단위가 한 덩어리다
//   (DM-26 `formatGearWeight`).
const WarehouseDetailInformationView: FC<Props> = ({ gear }) => {
  // 한글 표시명 우선 — 창고/검색 리스트와 동일한 이름으로 보이게 한다(GD-1).
  const company = gear.getDisplayCompany();
  const name = gear.getDisplayName();
  const weight = gear.getWeight();
  const imageUrl = gear.getImageUrl();
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
      {imageUrl ? (
        <View style={styles.photoRow}>
          <WarehouseDetailImagePreviewView imageUrl={imageUrl} />
        </View>
      ) : null}

      {/* 값이 없으면 줄 자체를 렌더하지 않는다(GD-1) — 빈 텍스트를 두면 죽은 공백이 생겨
          이름이 아래로 밀린다. 무게 줄·태그 줄과 같은 규칙. */}
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

      {/* 무게는 이름 아래 독립 줄이고 `무게` 캡션은 생략한다 — `g` 단위가 이미 무엇인지
          말해주고 목록 행에도 캡션이 없다. 캡션 없이도 화면에서 가장 큰 숫자라 시각 앵커는
          무게다(GD-1). 콘덴스드는 한글 글리프가 없어 숫자·단위에만 쓴다. */}
      {hasWeight(weight) ? (
        <PretendardText style={styles.weightText} numberOfLines={1}>
          {formatGearWeight(weight)}
        </PretendardText>
      ) : null}

      {/* 태그가 하나도 없으면 줄째로 뺀다 — 빈 줄을 남기면 위 여백만큼 죽은 공백이 생긴다. */}
      {tags.length > 0 ? (
        <View style={styles.tags}>
          {/* 세 값이 서로 다른 축이라 같은 문자열이 겹칠 수 있다(색상 `블랙` · 사이즈 `블랙`
              같은 데이터가 실제로 있다) — 라벨만으로 키를 만들면 중복 키가 된다. */}
          {tags.map((tag, index) => (
            <LiquidChip key={`${index}-${tag}`} label={tag} size='sm' />
          ))}
        </View>
      ) : null}
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
  // 이름 바로 아래 좌측 독립 줄. 숫자와 단위가 한 덩어리라 같은 베이스라인에 앉는다.
  weightText: {
    marginTop: 8,
    fontFamily: LiquidFont.condensed,
    fontSize: LiquidType.numXl.fontSize,
    lineHeight: LiquidType.numXl.lineHeight,
    letterSpacing: LiquidType.numXl.letterSpacing,
    color: Liquid.ink,
  },
  // 태그는 정체의 마지막 층 — 이름·무게를 읽은 뒤 확인하는 사실들이다.
  tags: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});

export default observer(WarehouseDetailInformationView);
