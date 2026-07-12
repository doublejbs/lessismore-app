import { FC, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NaverMapView,
  NaverMapViewRef,
  NaverMapMarkerOverlay,
  Camera,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import CampSiteType from '@/model/camp-site/CampSiteType';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { getCampSiteTypeLabel } from '@/model/camp-site/CampSiteLabels';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import { deltaToZoom } from '@/model/map/MapZoom';
import CategoryChipView from '@/components/browse/CategoryChipView';
import CampSiteSummaryCardView from './CampSiteSummaryCardView';

interface Props {
  campSiteMap: CampSiteMap;
}

// 남한 전역이 보이는 폴백 카메라(위치 권한 거부/미결정 시).
// 중심=남한 중앙, 줌=기존 latitudeDelta 4.8 등가(iPhone 세로 ~850dp 기준 zoom ≈ 8).
const KOREA_CAMERA: Camera = {
  latitude: 36.2,
  longitude: 127.9,
  zoom: deltaToZoom(4.8),
};

// 최초 진입 1회 규제 고지(CS-4) 표시 여부 저장 키.
const NOTICE_STORAGE_KEY = 'campSiteNoticeShown';

// iOS 네이티브 탭바(리퀴드 글래스)는 풀블리드 지도 위에 떠 있으므로
// 하단 플로팅 요소는 탭바 높이만큼 띄운다. Android JS 탭바는 레이아웃 공간을 차지해 불필요.
const TAB_BAR_HEIGHT = 49;

// 마커는 이 줌 이상으로 확대했을 때 모두 표시하고,
// 줌아웃 상태에서는 샘플(0.5° 격자, 최대 30개)로 지역을 분산 표시한다(CS-2).
// 임계 latitudeDelta ≤ 1.2 등가(iPhone 세로 ~850dp 기준 zoom ≈ 10).
const MARKER_VISIBLE_MIN_ZOOM = deltaToZoom(1.2);

// 유형별 마커 색 — 디자인 토큰 외 시맨틱 리터럴 허용:
// 야영장=검정, 대피소=회색, 노지=주황(현지 규제 주의).
// 커스텀 원형 View 마커의 배경색으로 사용하므로 색이 그대로 렌더된다.
const getMarkerColor = (type: CampSiteType): string => {
  switch (type) {
    case CampSiteType.Shelter: {
      return '#767676';
    }
    case CampSiteType.Wild: {
      return '#FF9500';
    }
    default: {
      return '#000000';
    }
  }
};

const TYPE_FILTERS: { label: string; value: CampSiteType | null }[] = [
  { label: '전체', value: null },
  {
    label: getCampSiteTypeLabel(CampSiteType.Campground),
    value: CampSiteType.Campground,
  },
  {
    label: getCampSiteTypeLabel(CampSiteType.Shelter),
    value: CampSiteType.Shelter,
  },
  {
    label: getCampSiteTypeLabel(CampSiteType.Wild),
    value: CampSiteType.Wild,
  },
];

const CampSiteMapView: FC<Props> = observer(({ campSiteMap }) => {
  const router = useRouter();
  const mapRef = useRef<NaverMapViewRef>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  // 지도 초기화 완료 여부 — 위치 추적 모드는 초기화 후에만 설정할 수 있다.
  const [mapReady, setMapReady] = useState(false);
  // 검색 인풋 포커스 여부 — 드롭다운은 query가 있고 포커스 상태일 때만 표시(CS-6).
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const insets = useSafeAreaInsets();

  // 하단 플로팅 요소(현재 위치 버튼·요약 카드)가 iOS 플로팅 탭바에 가리지 않게 하는 여유.
  const bottomClearance =
    Platform.OS === 'ios' ? insets.bottom + TAB_BAR_HEIGHT : 0;

  // 지도 최초 진입 시 위치 권한 요청 → 허용 시 현재 위치로 카메라 이동(CS-1).
  useEffect(() => {
    let cancelled = false;

    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted' || cancelled) {
          return;
        }

        setLocationGranted(true);

        const position = await Location.getCurrentPositionAsync({});

        if (cancelled) {
          return;
        }

        mapRef.current?.animateCameraTo({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          zoom: deltaToZoom(0.2),
          duration: 500,
        });
      } catch (error) {
        console.error('위치 권한 요청 실패:', error);
      }
    };

    requestLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  // 최초 진입 1회 규제 고지(CS-4) — 토스트로 노출 후 기기에 표시 완료 저장.
  useEffect(() => {
    const showNoticeOnce = async () => {
      const shown = await LocalStorageManager.get<boolean>(NOTICE_STORAGE_KEY);

      if (shown) {
        return;
      }

      app.getToastManager()?.show({
        message:
          '노지 야영은 지역에 따라 금지될 수 있어요. 이용 전 현지 규정을 확인하세요.',
      });

      await LocalStorageManager.set(NOTICE_STORAGE_KEY, true);
    };

    showNoticeOnce();
  }, []);

  // 권한 허용 + 지도 초기화 완료 시 현위치 오버레이(파란 점)를 표시한다.
  // NoFollow는 오버레이만 사용자 위치를 따라가고 카메라는 움직이지 않는다(기존 showsUserLocation 대체).
  useEffect(() => {
    if (!mapReady || !locationGranted) {
      return;
    }

    mapRef.current?.setLocationTrackingMode('NoFollow');
  }, [mapReady, locationGranted]);

  const handleMoveToCurrentLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({});

      mapRef.current?.animateCameraTo({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        zoom: deltaToZoom(0.2),
        duration: 500,
      });
    } catch (error) {
      console.error('현재 위치 이동 실패:', error);
    }
  };

  // 검색 결과 탭 → 키보드/드롭다운 닫기 + 카메라 이동(줌인) + 요약 카드 오픈(CS-6). 검색어는 유지.
  const handleSelectResult = (spot: CampSpot) => {
    Keyboard.dismiss();

    setIsSearchFocused(false);

    campSiteMap.selectSpot(spot);

    mapRef.current?.animateCameraTo({
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
      zoom: deltaToZoom(0.05),
      duration: 500,
    });
  };

  // 검색 시작 시 요약 카드를 닫아 드롭다운과 카드가 동시에 뜨지 않게 한다.
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    campSiteMap.selectSpot(null);
  };

  const handleMarkerTap = (spot: CampSpot) => {
    campSiteMap.selectSpot(spot);
  };

  // 지도 빈 곳 터치 → 요약 카드 닫기 + 키보드 dismiss(드롭다운 blur로 닫힘, CS-6).
  // 네이버는 마커 onTap과 지도 onTapMap이 분리돼 있어 별도 경합 방어가 필요 없다.
  const handleTapMap = () => {
    campSiteMap.selectSpot(null);

    // Android는 Keyboard.dismiss 후에도 blur가 안 뜰 수 있어 드롭다운 닫힘을 명시한다.
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  const selectedSpot = campSiteMap.getSelectedSpot();
  const query = campSiteMap.getQuery();
  const searchResults = campSiteMap.getSearchResults();
  const showSearchResults = query.trim().length > 0 && isSearchFocused;

  // 초기 카메라(전국)는 임계 밖이므로 false로 시작.
  const [markersVisible, setMarkersVisible] = useState(false);

  const handleCameraChanged = (camera: Camera) => {
    const zoom = camera.zoom ?? 0;

    setMarkersVisible(zoom >= MARKER_VISIBLE_MIN_ZOOM);
  };

  const markerSpots = markersVisible
    ? campSiteMap.getVisibleSpots()
    : campSiteMap.getSampledSpots();

  return (
    <View style={styles.container}>
      <NaverMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCamera={KOREA_CAMERA}
        // 네이버 기본 현위치 버튼은 자체 버튼과 중복이라 숨긴다.
        isShowLocationButton={false}
        // 기본 줌 버튼/스케일바는 기존 지도 UI 톤(핀치 줌만)과 달라 숨긴다.
        isShowZoomControls={false}
        isShowScaleBar={false}
        onInitialized={() => setMapReady(true)}
        onTapMap={handleTapMap}
        onCameraChanged={handleCameraChanged}
      >
        {markerSpots.map(spot => (
          <NaverMapMarkerOverlay
            key={spot.id}
            latitude={spot.location.latitude}
            longitude={spot.location.longitude}
            anchor={{ x: 0.5, y: 0.5 }}
            width={44}
            height={44}
            onTap={() => handleMarkerTap(spot)}
          >
            {/* 44pt 히트 영역 안에 20pt 원 — 작은 마커의 탭 인식률 확보.
                커스텀 View 마커는 최상위 자식에 생김새 의존성(색)을 key로 넘기고
                collapsable=false로 렌더를 보장해야 한다(라이브러리 요구사항). */}
            <View
              key={`${spot.id}/${getMarkerColor(spot.type)}`}
              collapsable={false}
              style={styles.markerHitArea}
            >
              <View
                style={[
                  styles.marker,
                  { backgroundColor: getMarkerColor(spot.type) },
                ]}
              />
            </View>
          </NaverMapMarkerOverlay>
        ))}
      </NaverMapView>

      {/* 상단 오버레이: 로드 실패 배너 + 검색 인풋/드롭다운 + 유형 필터 칩 행 */}
      <SafeAreaView
        edges={['top']}
        style={styles.topOverlay}
        pointerEvents='box-none'
      >
        {/* 박지 검색(CS-6) — 날씨 지도 피커와 동일한 카드형 검색 UI */}
        <View style={styles.searchWrap}>
          <View style={styles.searchCard}>
            <View style={styles.searchBox}>
              <Ionicons name='search' size={18} color={Color.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder='박지 검색'
                placeholderTextColor={Color.textSecondary}
                value={query}
                onChangeText={value => campSiteMap.setQuery(value)}
                onFocus={handleSearchFocus}
                onBlur={() => setIsSearchFocused(false)}
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
                      onPress={() => handleSelectResult(spot)}
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

        {/* 검색 결과가 열려 있는 동안 유형 칩은 숨긴다 — 검색은 유형과 독립이라 무의미하고,
            드롭다운에 밀려 지도 한가운데 떠 보이는 문제(디자인 리뷰)를 막는다. */}
        {!showSearchResults && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            keyboardShouldPersistTaps='handled'
          >
            {TYPE_FILTERS.map(filter => (
              <CategoryChipView
                key={filter.label}
                label={filter.label}
                selected={campSiteMap.getSelectedType() === filter.value}
                onPress={() => campSiteMap.selectType(filter.value)}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {campSiteMap.isLoading() && (
        <View style={styles.loadingWrap} pointerEvents='none'>
          <ActivityIndicator size='small' color={Color.textPrimary} />
        </View>
      )}

      {/* 현재 위치 버튼 — 권한 허용 시에만 노출 */}
      {locationGranted && (
        <View
          style={[
            styles.locateWrap,
            { bottom: bottomClearance + (selectedSpot ? 190 : 24) },
          ]}
          pointerEvents='box-none'
        >
          <TouchableOpacity
            style={styles.locateButton}
            onPress={handleMoveToCurrentLocation}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='현재 위치로 이동'
          >
            <Ionicons name='locate' size={22} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {selectedSpot && (
        <CampSiteSummaryCardView
          spot={selectedSpot}
          bottomInset={bottomClearance}
          onPress={() => router.push(`/camp-site/${selectedSpot.id}`)}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  // 유형별 색을 그대로 표현하는 커스텀 원형 마커(위 getMarkerColor 주석 참고).
  markerHitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Color.background,
  },
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
    gap: 8,
    // 검색 카드(marginHorizontal 12)와 좌측 정렬.
    paddingHorizontal: 12,
  },
  // 검색 카드 + 결과 카드 묶음(CS-6) — 날씨 지도 피커(WeatherMapPickerView)와 동일한 UI 언어.
  searchWrap: {
    marginHorizontal: 12,
    gap: 8,
  },
  // 흰 카드 안에 회색 인풋 (날씨 피커 headerCard/searchBox와 동일).
  searchCard: {
    padding: 12,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
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
  // bottom은 탭바 여유(bottomClearance) + 카드 유무에 따라 렌더에서 동적으로 지정한다.
  locateWrap: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
  },
  locateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Color.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
});

export default CampSiteMapView;
