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
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';
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
import CategoryChipView from '@/components/browse/CategoryChipView';
import CampSiteSummaryCardView from './CampSiteSummaryCardView';

interface Props {
  campSiteMap: CampSiteMap;
}

// 남한 전역이 보이는 폴백 카메라(위치 권한 거부/미결정 시).
const KOREA_REGION: Region = {
  latitude: 36.2,
  longitude: 127.9,
  latitudeDelta: 4.8,
  longitudeDelta: 4.2,
};

// 최초 진입 1회 규제 고지(CS-4) 표시 여부 저장 키.
const NOTICE_STORAGE_KEY = 'campSiteNoticeShown';

// iOS 네이티브 탭바(리퀴드 글래스)는 풀블리드 지도 위에 떠 있으므로
// 하단 플로팅 요소는 탭바 높이만큼 띄운다. Android JS 탭바는 레이아웃 공간을 차지해 불필요.
const TAB_BAR_HEIGHT = 49;

// 유형별 마커 색 — 디자인 토큰 외 시맨틱 리터럴 허용:
// 야영장=검정, 대피소=회색, 노지=주황(현지 규제 주의).
// Android(Google Maps)의 Marker pinColor는 hue만 반영해 검정/회색이 빨강으로
// 렌더되므로, 이 색은 커스텀 원형 View 마커의 배경색으로 사용한다.
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
  const mapRef = useRef<MapView>(null);
  const [locationGranted, setLocationGranted] = useState(false);
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

        mapRef.current?.animateToRegion(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.2,
            longitudeDelta: 0.2,
          },
          500
        );
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

  const handleMoveToCurrentLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({});

      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        },
        500
      );
    } catch (error) {
      console.error('현재 위치 이동 실패:', error);
    }
  };

  // 검색 결과 탭 → 키보드/드롭다운 닫기 + 카메라 이동(줌인) + 요약 카드 오픈(CS-6). 검색어는 유지.
  const handleSelectResult = (spot: CampSpot) => {
    Keyboard.dismiss();

    setIsSearchFocused(false);

    campSiteMap.selectSpot(spot);

    mapRef.current?.animateToRegion(
      {
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      500
    );
  };

  // 마커 탭이 지도 onPress로도 전파되는 경합(iOS) 방어용 플래그.
  const markerPressedRef = useRef(false);

  const handleMarkerPress = (spot: CampSpot) => {
    markerPressedRef.current = true;
    campSiteMap.selectSpot(spot);
  };

  // 지도 빈 곳 터치 → 요약 카드 닫기 + 키보드 dismiss(드롭다운 blur로 닫힘, CS-6).
  // 마커 탭 직후 전파된 press는 무시해 카드가 열리자마자 닫히지 않게 한다.
  const handleMapPress = (event: MapPressEvent) => {
    if (
      event.nativeEvent?.action === 'marker-press' ||
      markerPressedRef.current
    ) {
      markerPressedRef.current = false;

      return;
    }

    campSiteMap.selectSpot(null);

    // Android는 Keyboard.dismiss 후에도 blur가 안 뜰 수 있어 드롭다운 닫힘을 명시한다.
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  const selectedSpot = campSiteMap.getSelectedSpot();
  const query = campSiteMap.getQuery();
  const searchResults = campSiteMap.getSearchResults();
  const showSearchResults = query.trim().length > 0 && isSearchFocused;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={KOREA_REGION}
        onPress={handleMapPress}
      >
        {campSiteMap.getVisibleSpots().map(spot => (
          <Marker
            key={spot.id}
            coordinate={{
              latitude: spot.location.latitude,
              longitude: spot.location.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            onPress={() => handleMarkerPress(spot)}
          >
            {/* 44pt 히트 영역 안에 20pt 원 — 작은 마커의 탭 인식률 확보 */}
            <View style={styles.markerHitArea}>
              <View
                style={[
                  styles.marker,
                  { backgroundColor: getMarkerColor(spot.type) },
                ]}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* 상단 오버레이: 로드 실패 배너 + 검색 인풋/드롭다운 + 유형 필터 칩 행 */}
      <SafeAreaView
        edges={['top']}
        style={styles.topOverlay}
        pointerEvents='box-none'
      >
        {/* 박지 검색(CS-6) — 필터 칩 행 위, 지도 위 흰 pill */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name='search' size={18} color={Color.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder='박지 검색'
              placeholderTextColor={Color.textSecondary}
              value={query}
              onChangeText={value => campSiteMap.setQuery(value)}
              onFocus={() => setIsSearchFocused(true)}
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
                  size={20}
                  color={Color.iconMuted}
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
                      onPress={() => handleSelectResult(spot)}
                      activeOpacity={0.7}
                      accessibilityRole='button'
                      accessibilityLabel={`${spot.name} 지도에서 보기`}
                    >
                      <PretendardText
                        style={styles.resultName}
                        weight='bold'
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
  // Android hue 문제 회피용 커스텀 원형 마커(위 getMarkerColor 주석 참고).
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
    paddingHorizontal: 16,
  },
  // 검색 인풋 + 드롭다운 묶음(CS-6) — 칩 행과 좌우 여백을 맞춘다.
  searchWrap: {
    marginHorizontal: 16,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Color.borderLight,
    backgroundColor: Color.background,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  dropdown: {
    maxHeight: 320,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
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
    paddingHorizontal: 14,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
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
    marginHorizontal: 16,
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
