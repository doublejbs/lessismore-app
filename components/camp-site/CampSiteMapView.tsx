import { FC, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import CampSiteType from '@/model/camp-site/CampSiteType';
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

  const selectedSpot = campSiteMap.getSelectedSpot();

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={KOREA_REGION}
        onPress={() => campSiteMap.selectSpot(null)}
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
            onPress={() => campSiteMap.selectSpot(spot)}
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: getMarkerColor(spot.type) },
              ]}
            />
          </Marker>
        ))}
      </MapView>

      {/* 상단 오버레이: 로드 실패 배너 + 유형 필터 칩 행 */}
      <SafeAreaView
        edges={['top']}
        style={styles.topOverlay}
        pointerEvents='box-none'
      >
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
          style={[styles.locateWrap, selectedSpot && styles.locateWrapRaised]}
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
  locateWrap: {
    position: 'absolute',
    right: 16,
    bottom: 40,
    alignItems: 'flex-end',
  },
  // 요약 카드가 떠 있을 때 버튼을 카드 위로 올린다.
  locateWrapRaised: {
    bottom: 190,
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
