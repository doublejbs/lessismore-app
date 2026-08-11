import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import { Acg, AcgFontSize, AcgLayout, Spacing } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { GEAR_FILTER_NAMES } from '@/model/gear/GearFilterName';

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
// - 2층(정체): 좌측 브랜드 → 이름 → 메타, 우측 무게. **사진 유무와 무관하게 항상 같은 형태**다.
//   좌 정체 · 우 지표는 창고 목록(WH-1)·배낭 목록(BAG-1)과 공유하는 앱 전역 행 문법이라 무게가 늘
//   같은 자리에 온다. 사진이 있을 때만 무게를 컬럼에 넣고 없을 때 히어로로 키우면 같은 화면이 두
//   얼굴이 되므로, 사진 유무는 **1층 렌더 여부만** 가른다.
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

  return (
    <View style={styles.container}>
      {photo ? <View style={styles.photoRow}>{photo}</View> : null}

      <View style={styles.identityRow}>
        <View style={styles.identityColumn}>
          {/* 값이 없으면 줄 자체를 렌더하지 않는다(GD-1) — 빈 텍스트를 두면 정체 줄에
              죽은 공백이 생겨 이름이 아래로 밀린다. 메타 라인과 같은 규칙. */}
          {company ? (
            <PretendardText
              style={styles.companyText}
              weight='bold'
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
          {metaLine ? (
            <PretendardText style={styles.metaText} numberOfLines={1}>
              {metaLine}
            </PretendardText>
          ) : null}
        </View>

        {/* 무게는 32pt 우측 정렬, `무게` 캡션은 생략한다 — `g` 단위가 이미 무엇인지 말해주고
            목록 행에도 캡션이 없다. 캡션 없이도 화면에서 가장 큰 활자라 시각 앵커는 무게다(GD-1). */}
        {weight ? (
          <AcgDisplayText style={styles.weightText} numberOfLines={1}>
            {`${weight}g`}
          </AcgDisplayText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 층 사이 간격(gap)은 바깥 여백(20)보다 좁게 둬 두 층이 한 덩어리로 읽히게 한다.
  // 사진이 없으면 자식이 정체 줄 하나뿐이라 gap은 적용되지 않는다(GD-1).
  container: {
    flexDirection: 'column',
    gap: Spacing.item,
    paddingTop: Spacing.screenH,
    paddingHorizontal: AcgLayout.screenH,
    marginBottom: Spacing.screenH,
  },
  // 1층 — 사진은 가운데 단독 줄(GD-1).
  photoRow: {
    alignItems: 'center',
  },
  // 2층 — 좌 정체 · 우 무게. 세로는 **상단 정렬**이다. 좌측이 3줄이라 목록 행(GearView)의 가운데
  // 정렬을 그대로 쓰면 무게가 이름 줄 옆으로 내려앉아 브랜드 줄과 짝지어 읽히지 않는다.
  // 32pt/40 무게와 24pt/32 브랜드는 행간 비율이 비슷해 상단 정렬만으로 글자 윗선이 거의 맞는다.
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.item,
  },
  identityColumn: {
    flex: 1,
    // 긴 브랜드·이름이 컬럼을 밀어내 우측 무게를 침범하지 않도록 최소 폭을 0으로 둔다(GD-1).
    minWidth: 0,
  },
  // GD-1: 브랜드는 제품명(nameText)과 동일한 타이포로 표시한다.
  companyText: {
    fontSize: 24,
    lineHeight: 32,
    color: Acg.ink,
  },
  nameText: {
    fontSize: 24,
    lineHeight: 32,
    color: Acg.ink,
    marginTop: 2,
  },
  metaText: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
    marginTop: 6,
  },
  // 무게 — 고정 폭이 아니라 콘텐츠 폭이되 줄어들거나 줄바꿈되지 않게 한다(GD-1).
  // 숫자라 콘덴스드를 쓴다 — 이 화면의 시각 앵커(ACG).
  weightText: {
    fontSize: 32,
    lineHeight: 40,
    color: Acg.ink,
    textAlign: 'right',
    flexShrink: 0,
  },
});

export default observer(WarehouseDetailInformationView);
