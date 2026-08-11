import { FC, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import CampSiteType from '@/model/camp-site/CampSiteType';
import CampSiteTag from '@/model/camp-site/CampSiteTag';
import {
  getCampSiteTagLabel,
  getCampSiteTypeColor,
  getCampSiteTypeLabel,
} from '@/model/camp-site/CampSiteLabels';
import LiquidChip from '@/components/liquid/LiquidChip';
import { LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  campSiteMap: CampSiteMap;
  // 유형·태그 필터 변경 직후 피드백(지도 탭의 결과 수 토스트, CS-2).
  //   선택기는 토스트를 띄우지 않아 넘기지 않는다(DST-3).
  onChangeFilter?: (() => void) | undefined;
  /**
   * 지형(태그) 줄을 **접어 두고** 유형 줄 끝의 `지형` 칩으로 펼친다(CS-2).
   *
   * 지도 탭에서만 켠다 — 뒤가 지도라 상단 오버레이가 두 줄이면 검색 필드까지 합쳐 150pt를
   * 지도에서 뺏는데, 지형 7종은 지도를 처음 열 때 반드시 보여야 할 컨트롤이 아니다
   * (2026-08-11 디자인 리뷰). 여행지 선택기(DST-3)는 뒤에 가릴 지도가 없어 두 줄을 그대로 둔다.
   */
  collapsibleTags?: boolean;
}

// 유형 필터(CS-2) — 단일 선택. 칩의 색 도트가 지도 마커 색 범례를 겸한다.
// 무필터인 `전체`를 맨 앞에 두고 백패킹(wild)→대피소→캠핑장(campground) 순으로 잇는다 —
// 필터 해제 수단이 항상 첫 자리에 있어야 찾기 쉽다.
const TYPE_FILTERS: {
  label: string;
  value: CampSiteType | null;
  dotColor?: string;
}[] = [
  { label: '전체', value: null },
  ...(
    [CampSiteType.Wild, CampSiteType.Shelter, CampSiteType.Campground] as const
  ).map(type => ({
    label: getCampSiteTypeLabel(type),
    value: type,
    dotColor: getCampSiteTypeColor(type),
  })),
];

// 태그 필터(CS-2) — 재탭으로 해제(토글)한다. 유형 행과는 행이 갈려 있어
// `#` 접두 없이도 축이 구분된다(접두를 빼 라벨을 짧고 깔끔하게 유지).
const TAG_FILTERS: { label: string; value: CampSiteTag }[] = Object.values(
  CampSiteTag
).map(tag => ({
  label: getCampSiteTagLabel(tag),
  value: tag,
}));

// 태그 축의 이름. 접힌 상태의 여닫이 칩과 스펙이 같은 말을 쓴다(`지형`).
const TAG_AXIS_LABEL = '지형';

// 칩 사이 간격(아래 `filterRow.gap`과 같은 값) — 여닫이 칩 자리를 계산할 때 다시 쓴다.
const CHIP_GAP = 8;

// 필터 칩 공용 뷰(CS-2, DST-3): 1행 유형(전체/백패킹/대피소/캠핑장) +
// 2행 태그(지형, 토글, 가로 스크롤). 지도 탭과 배낭 여행지 선택기가 함께 쓴다.
// ★ 즐겨찾기는 하단 플로팅 버튼으로 옮겨 이 칩 행에선 다루지 않는다(CS-9).
// 필터 상태는 넘겨받은 campSiteMap 인스턴스에 실려 마커 표시 대상에 AND로 적용된다.
const CampSiteFilterChipsView: FC<Props> = observer(
  ({ campSiteMap, onChangeFilter, collapsibleTags = false }) => {
    // 선택 칩 시인성(CS-2): 스크롤되는 태그 행에서 가려진 칩을 선택해도 보이도록,
    // 칩별 x 위치를 기록해 두고 선택 시 행을 해당 위치로 스크롤한다.
    // (유형 행은 4칩이 스크롤 없이 화면에 다 들어가 불필요)
    const tagScrollRef = useRef<ScrollView>(null);
    const tagChipOffsets = useRef(new Map<CampSiteTag, number>());
    // 지형 줄을 펼쳐 두었는지. **필터 상태가 아니라 표시 상태**다 — 접어도 걸린 필터는 그대로고,
    // 접힌 칩 라벨(`지형 · 산`)이 그 사실을 말한다.
    const [tagsExpanded, setTagsExpanded] = useState(false);
    // 여닫이 칩은 유형 줄 **위에 고정**돼 있어(스크롤과 함께 밀리면 찾을 수 없다) 스크롤
    // 콘텐츠가 그만큼을 비워야 한다 — 라벨 길이에 따라 칩 폭이 바뀌므로 실측값을 쓴다.
    const [tagToggleWidth, setTagToggleWidth] = useState(0);

    const selectedTag = campSiteMap.getSelectedTag();
    const tagToggleLabel =
      selectedTag !== null
        ? `${TAG_AXIS_LABEL} · ${getCampSiteTagLabel(selectedTag)}`
        : TAG_AXIS_LABEL;
    const showTagRow = !collapsibleTags || tagsExpanded;

    const scrollToTagChip = (tag: CampSiteTag) => {
      const x = tagChipOffsets.current.get(tag);

      if (x === undefined) {
        return;
      }

      tagScrollRef.current?.scrollTo({
        x: Math.max(0, x - 16),
        animated: true,
      });
    };

    const handlePressType = (value: CampSiteType | null) => {
      campSiteMap.selectType(value);
      onChangeFilter?.();
    };

    // 태그 칩은 재탭으로 해제(토글)한다.
    const handlePressTag = (value: CampSiteTag) => {
      const next = campSiteMap.getSelectedTag() === value ? null : value;

      campSiteMap.selectTag(next);
      onChangeFilter?.();

      if (next !== null) {
        scrollToTagChip(next);
      }
    };

    // 펼치기·접기는 표시 상태만 바꾼다 — 필터는 건드리지 않는다.
    const handleToggleTags = () => {
      setTagsExpanded(prev => !prev);
    };

    // 축당 한 행(CS-2): 1행 유형(전체+색 도트 범례) + 2행 태그(토글, 가로 스크롤) —
    // 한 행에 합치면 "전체"가 스크롤 밖으로 사라지고 태그 발견 가능성이 떨어진다
    // (디자인 리뷰로 확정). 지도 탭은 2행을 기본으로 접어 지도를 돌려준다(collapsibleTags).
    return (
      <View style={styles.container}>
        {/* 지도 위라 비선택 채움을 한 단계 진하게 쓴다(`onMap`) — 지면 위 톤은 칩 라벨과
            지도 라벨이 겹쳐 읽힌다. 선택 상태는 다른 탭과 같은 잉크 채움이다
            (2차 태그 칩도 회색이 아니라 잉크). */}
        <View>
          {/* 유형 4칩 + 여닫이 칩은 좁은 기기에서 한 줄에 다 들어가지 않는다 — 줄을 가로로
              스크롤하고 여닫이 칩만 우측에 고정한다. 스크롤되는 칩은 그 칩 **아래로** 지나가므로
              (칩 면이 불투명) 잘린 자리가 "레이아웃 깨짐"이 아니라 "버튼 뒤"로 읽힌다. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.filterRow,
              collapsibleTags && tagToggleWidth > 0
                ? {
                    paddingRight:
                      LiquidLayout.screenH + tagToggleWidth + CHIP_GAP,
                  }
                : null,
            ]}
            keyboardShouldPersistTaps='handled'
          >
            {TYPE_FILTERS.map(filter => (
              <LiquidChip
                key={filter.label}
                label={filter.label}
                onMap
                {...(filter.dotColor !== undefined
                  ? { dotColor: filter.dotColor }
                  : {})}
                selected={campSiteMap.getSelectedType() === filter.value}
                onPress={() => handlePressType(filter.value)}
              />
            ))}
          </ScrollView>

          {collapsibleTags ? (
            <View
              style={styles.tagToggle}
              onLayout={event =>
                setTagToggleWidth(event.nativeEvent.layout.width)
              }
            >
              <LiquidChip
                label={tagToggleLabel}
                trailingIcon={tagsExpanded ? 'chevron-up' : 'chevron-down'}
                onMap
                // 걸린 지형이 있으면 접혀 있어도 잉크 채움으로 남는다 — 라벨과 함께
                // "필터가 켜져 있다"를 말한다.
                selected={selectedTag !== null}
                onPress={handleToggleTags}
              />
            </View>
          ) : null}
        </View>

        {showTagRow ? (
          <ScrollView
            ref={tagScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterRow, styles.tagRow]}
            keyboardShouldPersistTaps='handled'
          >
            {TAG_FILTERS.map(filter => (
              <View
                key={filter.value}
                onLayout={e =>
                  tagChipOffsets.current.set(
                    filter.value,
                    e.nativeEvent.layout.x
                  )
                }
              >
                <LiquidChip
                  label={filter.label}
                  size='sm'
                  onMap
                  selected={campSiteMap.getSelectedTag() === filter.value}
                  onPress={() => handlePressTag(filter.value)}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  // 두 행 사이 간격을 자체적으로 준다 — 부모 컨테이너의 gap에 의존하지 않아
  // 지도 탭·선택기 어디에 얹어도 동일한 톤을 유지한다.
  container: {
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CHIP_GAP,
    // 검색 필드·다른 탭 필터와 같은 화면 축(20).
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 2차(태그) 행은 탐색 탭 세분 카테고리 행과 같은 간격을 쓴다.
  tagRow: {
    gap: 6,
  },
  // 유형 줄 우측에 고정되는 여닫이 칩. 줄 높이를 그대로 받아 세로 중앙에 앉는다.
  tagToggle: {
    position: 'absolute',
    right: LiquidLayout.screenH,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});

export default CampSiteFilterChipsView;
