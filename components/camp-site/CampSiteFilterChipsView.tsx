import { FC, useRef } from 'react';
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
import CategoryChipView from '@/components/browse/CategoryChipView';
import CampSiteFavoriteChipView from './CampSiteFavoriteChipView';

interface Props {
  campSiteMap: CampSiteMap;
  // ★ 칩 노출 여부(CS-9). 지도 탭은 항상 노출하고 자체 로그인/빈 상태 가드를
  //   onPressFavorite에 담아 넘긴다. 선택기(DST-3)는 즐겨찾기 1건 이상일 때만 노출한다.
  showFavoriteChip: boolean;
  // ★ 칩 press 동작. 지도 탭은 로그인/빈 상태 가드가 든 핸들러를,
  //   선택기는 단순 토글을 넘긴다.
  onPressFavorite: () => void;
  // 유형·태그 필터 변경 직후 피드백(지도 탭의 결과 수 토스트, CS-2).
  //   선택기는 토스트를 띄우지 않아 넘기지 않는다(DST-3).
  onChangeFilter?: (() => void) | undefined;
}

// 유형 필터(CS-2) — 단일 선택, 백패킹(wild)→대피소→캠핑장(campground) 순. 칩의 색 도트가 지도 마커 색 범례를 겸한다.
const TYPE_FILTERS: {
  label: string;
  value: CampSiteType | null;
  dotColor?: string;
}[] = [
  { label: '전체', value: null },
  ...([
    CampSiteType.Wild,
    CampSiteType.Shelter,
    CampSiteType.Campground,
  ] as const).map(type => ({
    label: getCampSiteTypeLabel(type),
    value: type,
    dotColor: getCampSiteTypeColor(type),
  })),
];

// 태그 필터(CS-2) — `#` 접두로 유형과 축을 구분하고, 재탭으로 해제(토글)한다.
const TAG_FILTERS: { label: string; value: CampSiteTag }[] = Object.values(
  CampSiteTag
).map(tag => ({
  label: `#${getCampSiteTagLabel(tag)}`,
  value: tag,
}));

// 필터 칩 공용 뷰(CS-2/CS-9, DST-3): 1행 유형(★ + 전체/백패킹/대피소/캠핑장) +
// 2행 태그(#접두, 토글, 가로 스크롤). 지도 탭과 배낭 여행지 선택기가 함께 쓴다.
// 필터 상태는 넘겨받은 campSiteMap 인스턴스에 실려 마커 표시 대상에 AND로 적용된다.
const CampSiteFilterChipsView: FC<Props> = observer(
  ({ campSiteMap, showFavoriteChip, onPressFavorite, onChangeFilter }) => {
    // 선택 칩 시인성(CS-2): 스크롤되는 태그 행에서 가려진 칩을 선택해도 보이도록,
    // 칩별 x 위치를 기록해 두고 선택 시 행을 해당 위치로 스크롤한다.
    // (유형 행은 4칩이 스크롤 없이 화면에 다 들어가 불필요)
    const tagScrollRef = useRef<ScrollView>(null);
    const tagChipOffsets = useRef(new Map<CampSiteTag, number>());

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

    // 축당 한 행(CS-2): 1행 유형(전체+색 도트 범례, 스크롤 없이 전부 노출) +
    // 2행 태그(#접두, 토글, 가로 스크롤) — 한 행에 합치면 "전체"가 스크롤
    // 밖으로 사라지고 태그 발견 가능성이 떨어진다(디자인 리뷰로 확정).
    return (
      <View style={styles.container}>
        <View style={styles.filterRow}>
          {/* ★ 칩(CS-9): 유형 칩 1행의 `전체` 앞. 선택 시 즐겨찾기 박지만 마커 표시. */}
          {showFavoriteChip && (
            <CampSiteFavoriteChipView
              selected={campSiteMap.isFavoriteOnly()}
              onPress={onPressFavorite}
            />
          )}
          {TYPE_FILTERS.map(filter => (
            <CategoryChipView
              key={filter.label}
              label={filter.label}
              {...(filter.dotColor !== undefined
                ? { dotColor: filter.dotColor }
                : {})}
              selected={campSiteMap.getSelectedType() === filter.value}
              onPress={() => handlePressType(filter.value)}
            />
          ))}
        </View>

        <ScrollView
          ref={tagScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
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
              <CategoryChipView
                label={filter.label}
                selected={campSiteMap.getSelectedTag() === filter.value}
                onPress={() => handlePressTag(filter.value)}
              />
            </View>
          ))}
        </ScrollView>
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
    gap: 8,
    // 검색 카드(marginHorizontal 12)와 좌측 정렬.
    paddingHorizontal: 12,
  },
});

export default CampSiteFilterChipsView;
