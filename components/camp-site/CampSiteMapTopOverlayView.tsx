import { FC } from 'react';
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
import {
  Acg,
  AcgFontSize,
  AcgLayout,
  AcgRadius,
  AcgRow,
  AcgShadow,
} from '@/constants/DesignTokens';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTypeColor,
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';
import CampSiteFilterChipsView from './CampSiteFilterChipsView';

interface Props {
  campSiteMap: CampSiteMap;
  // 검색 결과 탭 — 카메라 이동은 mapRef를 가진 부모(CampSiteMapView)가 수행한다.
  onSelectResult: (spot: CampSpot) => void;
}

// 검색 필드 높이·아이콘 — 탐색 탭 필드와 같은 값.
const SEARCH_FIELD_HEIGHT = 48;

const SEARCH_ICON_SIZE = 20;

// 지도 상단 오버레이(CS-2/CS-6): 검색 인풋/드롭다운 + 유형 필터 칩 + 로드 실패 배너 + 로딩.
// 지도 화면에서 분리된 observer라 검색 타이핑·필터 선택이 마커 레이어를 리렌더하지 않는다.
const CampSiteMapTopOverlayView: FC<Props> = observer(
  ({ campSiteMap, onSelectResult }) => {
    const query = campSiteMap.getQuery();
    const searchResults = campSiteMap.getSearchResults();
    const showSearchResults =
      query.trim().length > 0 && campSiteMap.isSearchFocused();

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
          {/* 박지 검색(CS-6) — 탐색 탭 검색 필드와 같은 형태(돋보기 + 연회색 채움 + 모서리 12).
              지도 위라 채움만 불투명 흰 면 + 그림자로 지형·라벨과 분리한다. */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Ionicons name='search' size={SEARCH_ICON_SIZE} color={Acg.ink} />
              <TextInput
                style={styles.searchInput}
                placeholder='박지 검색'
                placeholderTextColor={Acg.textMuted}
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
                    size={20}
                    color={Acg.textMuted}
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
                        {/* 지도 마커와 같은 각진 유형색 면 — 목록에서 고른 것이 지도에서
                            어떤 마커인지 색으로 이어진다. 색만으로는 못 읽으므로 유형
                            이름은 아래 줄에 글자로도 둔다. */}
                        <View
                          style={[
                            styles.resultTypeMark,
                            {
                              backgroundColor: getCampSiteTypeColor(spot.type),
                            },
                          ]}
                        />
                        <View style={styles.resultTexts}>
                          <PretendardText
                            style={styles.resultName}
                            weight='semibold'
                            numberOfLines={1}
                          >
                            {spot.name}
                          </PretendardText>
                          <PretendardText
                            style={styles.resultMeta}
                            numberOfLines={1}
                          >
                            {`${getCampSiteTypeLabel(spot.type)} · ${getCampSpotRegionLabel(spot)}`}
                          </PretendardText>
                        </View>
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
          {/* 유형·태그 필터 칩(CS-2). ★ 즐겨찾기는 하단 오버레이 플로팅 버튼으로 옮겨
              칩 행에선 노출하지 않는다(CS-9). 선택기와 공용 뷰로 공유한다. */}
          {!showSearchResults && (
            <CampSiteFilterChipsView campSiteMap={campSiteMap} />
          )}
        </SafeAreaView>

        {campSiteMap.isLoading() && (
          <View style={styles.loadingWrap} pointerEvents='none'>
            <ActivityIndicator size='small' color={Acg.ink} />
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
  // 검색 pill + 결과 카드 묶음(CS-6).
  searchWrap: {
    marginHorizontal: AcgLayout.screenPadding,
    gap: 8,
  },
  /**
   * 탐색 탭 검색 필드와 같은 형태 — 돋보기 + 같은 패딩·폰트, 모서리 12.
   * 채움만 다르다: 연회색(반투명이든 회색이든)은 뒤가 단색 지면일 때 성립하는데 지도는 뒤가
   * 지형·도로·라벨이라 입력값이 그 위에 겹쳐 읽힌다(2026-08-03 실기기 확인).
   * **불투명 흰 면 + 그림자**로 지도와 분리한다 — 지도 위 요소에만 두는 예외다.
   */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: SEARCH_FIELD_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.card,
  },
  searchInput: {
    flex: 1,
    fontSize: AcgFontSize.control,
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
    padding: 0,
  },
  // 결과는 검색 필드 바로 아래 흰 면으로 이어 붙인다 — 같은 모서리·좌우 패딩이라 한 덩어리다.
  dropdown: {
    maxHeight: 260,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.paper,
    paddingHorizontal: 14,
    overflow: 'hidden',
    boxShadow: AcgShadow.card,
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
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.textMuted,
  },
  // 이름 + 메타 두 줄이라 축이 왼쪽 하나다. 예전에는 이름·유형 배지·지역이 한 줄에
  // 나란히 놓여 이름이 밀리고 지역은 오른쪽 끝에 떨어져 한 항목으로 안 읽혔다.
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
  },
  // 지도 마커(사각 18pt)의 축소판.
  resultTypeMark: {
    width: 10,
    height: 10,
    borderRadius: 0,
  },
  resultTexts: {
    flex: 1,
    gap: 2,
  },
  // 목록 행 문법(HM-8): 이름 18 + 메타 한 줄 15 잉크.
  resultName: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 24,
    color: Acg.ink,
  },
  resultMeta: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.ink,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: AcgLayout.screenPadding,
    paddingVertical: 12,
    paddingHorizontal: 14,
    // 검색 필드·결과 면과 같은 흰 면·모서리 — 같은 오버레이 스택이라 혼자 다르면 다른
    // 화면 요소로 읽힌다.
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.card,
  },
  errorText: {
    flex: 1,
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.ink,
  },
  // 알약 — 낱개로 놓이는 액션이다(칩과 형태를 가른다).
  retryButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: Acg.ink,
  },
  retryText: {
    fontSize: AcgFontSize.meta,
    color: Acg.paper,
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
