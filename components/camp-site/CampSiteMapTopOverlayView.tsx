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
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
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

// 유리 검색 필드 높이 — 탐색·검색 결과·창고 화면의 필드와 같은 값이다(목업 §2·§3·§4).
const FIELD_HEIGHT = 48;

// 지우기 버튼 터치 여유. 버튼은 28로 그리고 HIG 44는 여유로만 채운다: (44 − 28) / 2 = 8.
const CLEAR_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// 재시도 알약은 배너 안 보조 액션이라 칩 높이(34)로 그린다 — 키우면 배너가 두꺼워진다.
// HIG 44는 세로 여유로만 채운다: (44 − 34) / 2 = 5 → 6.
const RETRY_HIT_SLOP = { top: 6, bottom: 6, left: 8, right: 8 };

// 지도 상단 오버레이(CS-2/CS-6): 검색 인풋/드롭다운 + 유형 필터 칩 + 로드 실패 배너 + 로딩.
// 지도 화면에서 분리된 observer라 검색 타이핑·필터 선택이 마커 레이어를 리렌더하지 않는다.
const CampSiteMapTopOverlayView: FC<Props> = observer(
  ({ campSiteMap, onSelectResult }) => {
    const query = campSiteMap.getQuery();
    const searchResults = campSiteMap.getSearchResults();
    const hasQuery = query.length > 0;
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
          {/* 박지 검색(CS-6) — 지도 위에 떠 있는 알약. 지면 위 필드보다 채움이 진하다
              (`glassFillOnMap`) — 뒤가 지형·도로·라벨이라 옅은 유리로는 입력값이 겹쳐 읽힌다.
              **실제 블러는 쓰지 않는다**: 채움이 92%라 블러 결과가 사실상 보이지 않는데,
              지도는 팬·줌 중 프레임 예산이 가장 빡빡한 화면이라 매 프레임 비용만 남는다
              (필터 칩이 블러를 빼는 것과 같은 이유). */}
          <View style={styles.searchWrap}>
            {/* 그림자는 바깥 래퍼가 진다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 두면 잘린다. */}
            <View style={styles.fieldShadow}>
              <View style={styles.field}>
                <View style={styles.fieldBody}>
                  <Ionicons
                    name='search'
                    size={18}
                    color={hasQuery ? Liquid.ink : Liquid.inkMuted}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder='박지 검색'
                    placeholderTextColor={Liquid.inkMuted}
                    value={query}
                    onChangeText={value => campSiteMap.setQuery(value)}
                    onFocus={handleSearchFocus}
                    onBlur={() => campSiteMap.setSearchFocused(false)}
                    autoCorrect={false}
                    returnKeyType='search'
                  />
                  {hasQuery ? (
                    <TouchableOpacity
                      onPress={() => campSiteMap.clearQuery()}
                      style={styles.clearButton}
                      hitSlop={CLEAR_HIT_SLOP}
                      accessibilityRole='button'
                      accessibilityLabel='검색어 지우기'
                    >
                      <Ionicons
                        name='close-circle'
                        size={20}
                        color={Liquid.inkSubtle}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            {showSearchResults && (
              // 그림자는 바깥 래퍼가 진다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 두면
              // 그림자가 잘리고, 지도 위 흰 카드에 아무 경계도 남지 않는다(검색 필드와 같은 구조).
              <View style={styles.dropdownShadow}>
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
                      searchResults.map((spot, index) => (
                        // 구분선은 행 **밖**에 둔다 — 행 안에 두면 누를 때 activeOpacity에
                        // 함께 흐려져 선이 깜빡인다.
                        <View key={spot.id}>
                          {index > 0 ? (
                            <View style={styles.resultDivider} />
                          ) : null}
                          <TouchableOpacity
                            style={styles.resultRow}
                            onPress={() => onSelectResult(spot)}
                            activeOpacity={LiquidMotion.pressOpacity}
                            accessibilityRole='button'
                            accessibilityLabel={`${spot.name} 지도에서 보기`}
                          >
                            {/* 지도 마커와 같은 유형색 원 — 목록에서 고른 것이 지도에서 어떤
                              마커인지 색으로 이어진다. 색만으로는 못 읽으므로 유형 이름은
                              아래 줄에 글자로도 둔다. */}
                            <View
                              style={[
                                styles.resultTypeMark,
                                {
                                  backgroundColor: getCampSiteTypeColor(
                                    spot.type
                                  ),
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
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>
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
                activeOpacity={LiquidMotion.pressOpacity}
                hitSlop={RETRY_HIT_SLOP}
                accessibilityRole='button'
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
            <ActivityIndicator size='small' color={Liquid.ink} />
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
    gap: 12,
    paddingTop: 10,
  },
  // 검색 필드 + 결과 카드 묶음(CS-6).
  searchWrap: {
    marginHorizontal: LiquidLayout.screenH,
    gap: 8,
  },
  fieldShadow: {
    borderRadius: FIELD_HEIGHT / 2,
    boxShadow: LiquidShadow.glass,
  },
  field: {
    minHeight: FIELD_HEIGHT,
    borderRadius: FIELD_HEIGHT / 2,
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    backgroundColor: Liquid.glassFillOnMap,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fieldBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  searchInput: {
    flex: 1,
    // TextInput은 PretendardText로 감쌀 수 없어 서체를 직접 지정한다 — 지정하지 않으면
    // 입력값만 시스템 서체로 렌더돼 화면에서 튄다. 값은 15.5/500(목업 §4).
    fontFamily: 'Pretendard-Medium',
    fontSize: 15.5,
    color: Liquid.ink,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  clearButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * 결과는 필드 아래 **종이 카드**로 뜬다 — 유리로 두면 지도 위에서 행이 겹쳐 읽힌다.
   * 필드와 같은 좌우 축을 쓰고 모서리는 카드값(20)이라 알약 필드와 형태가 갈려
   * "필드에 이어 붙은 목록"으로 읽힌다.
   */
  dropdownShadow: {
    borderRadius: LiquidRadius.tile,
    boxShadow: LiquidShadow.card,
  },
  dropdown: {
    maxHeight: 260,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  dropdownScroll: {
    flexGrow: 0,
  },
  dropdownEmpty: {
    minHeight: LiquidLayout.touchMin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 13.5,
    color: Liquid.inkTertiary,
  },
  // 이름 + 메타 두 줄이라 축이 왼쪽 하나다.
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: LiquidLayout.touchMin,
    paddingVertical: 12,
  },
  // 행 사이 헤어라인 — 첫 행 위에는 두지 않는다(카드 상단 여백과 겹쳐 두 줄로 보인다).
  resultDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
  // 지도 마커(원 16pt)의 축소판.
  resultTypeMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultTexts: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontSize: 15,
    color: Liquid.ink,
  },
  resultMeta: {
    fontSize: 12.5,
    color: Liquid.inkMuted,
  },
  // 검색 결과 카드와 같은 종이 면 — 같은 오버레이 스택에 얹히는 면이라 혼자 유리면
  // 다른 화면 요소로 읽힌다.
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: LiquidLayout.screenH,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  errorText: {
    flex: 1,
    fontSize: 13.5,
    color: Liquid.ink,
  },
  // 배너 안 보조 액션이라 주 액션 알약(h54)이 아니라 칩 크기의 잉크 알약이다.
  retryButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: LiquidRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Liquid.ink,
  },
  retryText: {
    fontSize: 13,
    color: Liquid.surface,
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
