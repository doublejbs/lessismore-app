import { FC, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import CampSiteType from '@/model/camp-site/CampSiteType';
import CampSiteTag from '@/model/camp-site/CampSiteTag';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTagLabel,
  getCampSiteTypeColor,
  getCampSiteTypeLabel,
} from '@/model/camp-site/CampSiteLabels';
import CategoryChipView from '@/components/browse/CategoryChipView';

interface Props {
  campSiteMap: CampSiteMap;
  // 검색 결과 탭 — 카메라 이동은 mapRef를 가진 부모(CampSiteMapView)가 수행한다.
  onSelectResult: (spot: CampSpot) => void;
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

// 지도 상단 오버레이(CS-2/CS-6): 검색 인풋/드롭다운 + 유형 필터 칩 + 로드 실패 배너 + 로딩.
// 지도 화면에서 분리된 observer라 검색 타이핑·필터 선택이 마커 레이어를 리렌더하지 않는다.
const CampSiteMapTopOverlayView: FC<Props> = observer(
  ({ campSiteMap, onSelectResult }) => {
    const query = campSiteMap.getQuery();
    const searchResults = campSiteMap.getSearchResults();
    const showSearchResults =
      query.trim().length > 0 && campSiteMap.isSearchFocused();

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

    // 결과 수 피드백(CS-2): 필터 변경 결과를 토스트로 알린다.
    // 전체(무필터)로 돌아올 때는 띄우지 않는다.
    const showResultToast = () => {
      const type = campSiteMap.getSelectedType();
      const tag = campSiteMap.getSelectedTag();

      if (type === null && tag === null) {
        return;
      }

      const count = campSiteMap.getVisibleSpots().length;

      if (count === 0) {
        app.getToastManager()?.show({ message: '조건에 맞는 박지가 없어요' });

        return;
      }

      const parts = [
        tag !== null ? `#${getCampSiteTagLabel(tag)}` : '',
        type !== null ? getCampSiteTypeLabel(type) : '',
      ].filter(Boolean);
      const name = parts.length > 0 ? parts.join(' ') : '박지';

      app.getToastManager()?.show({ message: `${name} ${count}곳` });
    };

    const handlePressType = (value: CampSiteType | null) => {
      campSiteMap.selectType(value);
      showResultToast();
    };

    // 태그 칩은 재탭으로 해제(토글)한다.
    const handlePressTag = (value: CampSiteTag) => {
      const next = campSiteMap.getSelectedTag() === value ? null : value;

      campSiteMap.selectTag(next);
      showResultToast();

      if (next !== null) {
        scrollToTagChip(next);
      }
    };

    // 검색 시작 시 요약 카드를 닫아 드롭다운과 카드가 동시에 뜨지 않게 한다.
    const handleSearchFocus = () => {
      campSiteMap.setSearchFocused(true);
      campSiteMap.selectSpot(null);
    };

    return (
      <>
        {/* 상단 오버레이: 검색 인풋/드롭다운 + 로드 실패 배너 + 유형 필터 칩 행 */}
        <SafeAreaView
          edges={['top']}
          style={styles.topOverlay}
          pointerEvents='box-none'
        >
          {/* 박지 검색(CS-6) — 카드 프레임 없이 지도 위에 바로 뜨는 흰 pill(그림자) */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Ionicons name='search' size={20} color={Color.textPrimary} />
              <TextInput
                style={styles.searchInput}
                placeholder='박지 검색'
                placeholderTextColor={Color.textSecondary}
                value={query}
                onChangeText={value => campSiteMap.setQuery(value)}
                onFocus={handleSearchFocus}
                onBlur={() => campSiteMap.setSearchFocused(false)}
                autoCorrect={false}
                returnKeyType='search'
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => campSiteMap.clearQuery()}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole='button'
                  accessibilityLabel='검색어 지우기'
                >
                  <Ionicons
                    name='close-circle'
                    size={18}
                    color={Color.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {showSearchResults && (
              <View style={styles.dropdown}>
                <ScrollView
                  style={styles.dropdownScroll}
                  keyboardShouldPersistTaps='handled'
                  showsVerticalScrollIndicator={false}
                >
                  {searchResults.length === 0 ? (
                    <View style={styles.dropdownEmpty}>
                      <PretendardText style={styles.dropdownEmptyText}>
                        검색 결과가 없어요
                      </PretendardText>
                    </View>
                  ) : (
                    searchResults.map(spot => (
                      <TouchableOpacity
                        key={spot.id}
                        style={styles.resultRow}
                        onPress={() => onSelectResult(spot)}
                        activeOpacity={0.7}
                        accessibilityRole='button'
                        accessibilityLabel={`${spot.name} 지도에서 보기`}
                      >
                        <Ionicons
                          name='location-outline'
                          size={18}
                          color={Color.textSecondary}
                        />
                        <PretendardText
                          style={styles.resultName}
                          weight='medium'
                          numberOfLines={1}
                        >
                          {spot.name}
                        </PretendardText>
                        <View style={styles.resultBadge}>
                          <PretendardText
                            style={styles.resultBadgeText}
                            weight='medium'
                          >
                            {getCampSiteTypeLabel(spot.type)}
                          </PretendardText>
                        </View>
                        <PretendardText
                          style={styles.resultRegion}
                          numberOfLines={1}
                        >
                          {spot.region}
                        </PretendardText>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {campSiteMap.hasLoadError() && (
            <View style={styles.errorBanner}>
              <PretendardText
                style={styles.errorText}
                weight='medium'
                numberOfLines={1}
              >
                박지 정보를 불러오지 못했어요
              </PretendardText>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => campSiteMap.retry()}
                activeOpacity={0.8}
              >
                <PretendardText style={styles.retryText} weight='semibold'>
                  재시도
                </PretendardText>
              </TouchableOpacity>
            </View>
          )}

          {/* 검색 결과가 열려 있는 동안 필터 칩은 숨긴다 — 검색은 필터와 독립이라 무의미하고,
              드롭다운에 밀려 지도 한가운데 떠 보이는 문제(디자인 리뷰)를 막는다. */}
          {/* 축당 한 행(CS-2): 1행 유형(전체+색 도트 범례, 스크롤 없이 전부 노출) +
              2행 태그(#접두, 토글, 가로 스크롤) — 한 행에 합치면 "전체"가 스크롤
              밖으로 사라지고 태그 발견 가능성이 떨어진다(디자인 리뷰로 확정). */}
          {!showSearchResults && (
            <>
              <View style={styles.filterRow}>
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
            </>
          )}
        </SafeAreaView>

        {campSiteMap.isLoading() && (
          <View style={styles.loadingWrap} pointerEvents='none'>
            <ActivityIndicator size='small' color={Color.textPrimary} />
          </View>
        )}
      </>
    );
  }
);

const styles = StyleSheet.create({
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: 10,
    paddingTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // 검색 카드(marginHorizontal 12)와 좌측 정렬.
    paddingHorizontal: 12,
  },
  // 검색 pill + 결과 카드 묶음(CS-6).
  searchWrap: {
    marginHorizontal: 12,
    gap: 8,
  },
  // 카드 프레임 없이 지도 위에 바로 뜨는 흰 pill — 그림자로 지도와 분리해 시인성 확보.
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Color.background,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  // 결과는 별도 카드로 (날씨 피커 resultsCard와 동일).
  dropdown: {
    maxHeight: 260,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
    paddingHorizontal: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dropdownScroll: {
    flexGrow: 0,
  },
  dropdownEmpty: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  resultName: {
    flexShrink: 1,
    fontSize: 15,
    color: Color.textPrimary,
  },
  resultBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  resultBadgeText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  resultRegion: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
    color: Color.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Color.textPrimary,
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipActiveBg,
  },
  retryText: {
    fontSize: 13,
    color: Color.background,
  },
  loadingWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CampSiteMapTopOverlayView;
