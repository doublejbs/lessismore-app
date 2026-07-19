import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, StyleSheet, View } from 'react-native';
import {
  NaverMapView,
  NaverMapViewRef,
  Camera,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import { deltaToZoom } from '@/model/map/MapZoom';
import {
  isCampSiteDetailSheetOpen,
  setCampSiteDetailSheet,
} from '@/model/camp-site/CampSiteDetailSheetHandoff';
import CampSiteMapMarkersView, {
  CampSiteMapViewport,
} from './CampSiteMapMarkersView';
import CampSiteSelectedPulseView from './CampSiteSelectedPulseView';
import CampSiteMapTopOverlayView from './CampSiteMapTopOverlayView';
import CampSiteMapBottomOverlayView from './CampSiteMapBottomOverlayView';
import CampSiteFavoritesSheetView from './CampSiteFavoritesSheetView';

interface Props {
  campSiteMap: CampSiteMap;
}

interface CameraTarget {
  latitude: number;
  longitude: number;
  zoom: number;
  duration: number;
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

// 박지 지도 화면(CS-1/CS-2/CS-6)의 조립 컴포넌트. 지도(카메라·권한)만 직접 다루고,
// MobX 상태를 읽는 UI는 마커 레이어·상단(검색/칩) observer로 분리했다 —
// 검색 타이핑·카메라 이동이 서로(특히 마커 레이어)를 리렌더하지 않게 하기 위함.
const CampSiteMapView: FC<Props> = ({ campSiteMap }) => {
  const router = useRouter();
  const mapRef = useRef<NaverMapViewRef>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  // 지도 초기화 완료 여부 — 위치 추적 모드는 초기화 후에만 설정할 수 있다.
  const [mapReady, setMapReady] = useState(false);
  const mountedRef = useRef(true);
  const mapReadyRef = useRef(false);
  const pendingCameraTargetRef = useRef<CameraTarget | null>(null);
  const pendingCameraFrameRef = useRef<number | null>(null);
  // 현재 줌(마커 탭 시 줌은 유지한 채 그 박지를 중앙으로 이징하기 위함).
  const zoomRef = useRef<number>(deltaToZoom(0.2));
  const insets = useSafeAreaInsets();

  // 하단 플로팅 요소(현재 위치 버튼)가 iOS 플로팅 탭바에 가리지 않게 하는 여유.
  const bottomClearance =
    Platform.OS === 'ios' ? insets.bottom + TAB_BAR_HEIGHT : 0;

  // 마커 레이어용 뷰포트. onCameraChanged는 이동 중 연속 발화하므로
  // 값을 양자화해 실질 변화가 있을 때만 리렌더되게 한다.
  const [viewport, setViewport] = useState<CampSiteMapViewport | null>(null);
  // 즐겨찾기 리스트 시트(CS-9) 노출 여부. ★ 칩(상단 오버레이)이 로그인 가드 후 연다.
  const [favoritesVisible, setFavoritesVisible] = useState(false);

  const flushPendingCamera = useCallback(() => {
    if (
      pendingCameraFrameRef.current !== null ||
      !pendingCameraTargetRef.current
    ) {
      return;
    }

    pendingCameraFrameRef.current = requestAnimationFrame(() => {
      pendingCameraFrameRef.current = null;

      if (!mountedRef.current || !mapReadyRef.current || !mapRef.current) {
        return;
      }

      const target = pendingCameraTargetRef.current;

      if (!target) {
        return;
      }

      pendingCameraTargetRef.current = null;
      mapRef.current.animateCameraTo(target);
    });
  }, []);

  const moveCamera = useCallback(
    (target: CameraTarget) => {
      if (!mountedRef.current) {
        return;
      }

      if (
        !mapReadyRef.current ||
        !mapRef.current ||
        pendingCameraFrameRef.current !== null
      ) {
        pendingCameraTargetRef.current = target;

        if (mapReadyRef.current) {
          flushPendingCamera();
        }

        return;
      }

      pendingCameraTargetRef.current = null;
      mapRef.current.animateCameraTo(target);
    },
    [flushPendingCamera]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mapReadyRef.current = false;
      pendingCameraTargetRef.current = null;

      if (pendingCameraFrameRef.current !== null) {
        cancelAnimationFrame(pendingCameraFrameRef.current);
        pendingCameraFrameRef.current = null;
      }
    };
  }, []);

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

        moveCamera({
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
  }, [moveCamera]);

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
    if (
      !mapReady ||
      !locationGranted ||
      !mountedRef.current ||
      !mapReadyRef.current ||
      !mapRef.current
    ) {
      return;
    }

    mapRef.current.setLocationTrackingMode('NoFollow');
  }, [mapReady, locationGranted]);

  const handleMoveToCurrentLocation = useCallback(async () => {
    try {
      const position = await Location.getCurrentPositionAsync({});

      moveCamera({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        zoom: deltaToZoom(0.2),
        duration: 500,
      });
    } catch (error) {
      console.error('현재 위치 이동 실패:', error);
    }
  }, [moveCamera]);

  // 상세 시트의 위치로 이동 버튼(CS-2) — 지도를 움직였다가 다시 박지 위치로.
  // 검색 결과 선택과 동일한 줌 레벨로 이동한다.
  const handleMoveToSpot = useCallback(
    (spot: CampSpot) => {
      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });
    },
    [moveCamera]
  );

  // 박지 선택(CS-2): 마커 강조 + 상세 시트 오픈. 시트가 닫히면 강조를 해제한다.
  // 시트는 딤이 없어(sheetLargestUndimmedDetentIndex) 뒤 지도를 계속 조작할 수 있다 —
  // 즉 시트가 떠 있는 채로 다른 마커를 탭할 수 있으므로, 그때는 기존 시트를 닫고 새로 연다.
  const openDetail = useCallback(
    (spot: CampSpot) => {
      campSiteMap.selectSpot(spot);

      setCampSiteDetailSheet({
        onMoveToSpot: handleMoveToSpot,
        // 닫히는 시트가 이미 다른 박지로 넘어간 선택을 지우지 않게, 자기 박지일 때만 해제한다.
        onClose: () => {
          if (campSiteMap.getSelectedSpot()?.id === spot.id) {
            campSiteMap.selectSpot(null);
          }
        },
      });

      if (isCampSiteDetailSheetOpen()) {
        router.replace(`/camp-site/${spot.id}`);

        return;
      }

      router.push(`/camp-site/${spot.id}`);
    },
    [campSiteMap, handleMoveToSpot, router]
  );

  // 검색 결과 탭 → 키보드/드롭다운 닫기 + 카메라 이동(줌인) + 상세 시트 오픈(CS-6). 검색어는 유지.
  const handleSelectResult = useCallback(
    (spot: CampSpot) => {
      Keyboard.dismiss();

      campSiteMap.setSearchFocused(false);
      openDetail(spot);

      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });
    },
    [campSiteMap, moveCamera, openDetail]
  );

  // 마커 탭 콜백 — memo된 마커(CampSiteMarkerView)가 리렌더를 건너뛸 수 있게 참조를 고정한다.
  const handleMarkerTap = useCallback(
    (spot: CampSpot) => {
      openDetail(spot);
      // B: 선택 박지를 화면 중앙으로 부드럽게 이징(줌 유지) → 펄스(A)가 중앙에서 정렬돼 재생된다.
      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: zoomRef.current,
        duration: 400,
      });
    },
    [moveCamera, openDetail]
  );

  // 즐겨찾기 ★ 칩 → 리스트 시트 열기(CS-9). 로그인 가드는 상단 오버레이가 이미 통과시킨 뒤 호출한다.
  const handleOpenFavorites = useCallback(() => {
    app.getAnalyticsManager()?.logClick('camp_site_favorites_open');
    setFavoritesVisible(true);
  }, []);

  // 즐겨찾기 리스트 항목 탭 → 시트를 닫고 마커 탭과 동일한 흐름(카메라 이동 + 상세)으로 이어간다(CS-9).
  const handleSelectFavorite = useCallback(
    (spot: CampSpot) => {
      setFavoritesVisible(false);
      handleMarkerTap(spot);
    },
    [handleMarkerTap]
  );

  // 지도 빈 곳 터치 → 마커 선택 해제 + 키보드 dismiss(드롭다운 blur로 닫힘, CS-6).
  // 네이버는 마커 onTap과 지도 onTapMap이 분리돼 있어 별도 경합 방어가 필요 없다.
  const handleTapMap = useCallback(() => {
    campSiteMap.selectSpot(null);

    // Android는 Keyboard.dismiss 후에도 blur가 안 뜰 수 있어 드롭다운 닫힘을 명시한다.
    campSiteMap.setSearchFocused(false);
    Keyboard.dismiss();
  }, [campSiteMap]);

  const handleCameraChanged = useCallback((camera: Camera) => {
    if (!mountedRef.current) {
      return;
    }

    const zoom = camera.zoom ?? 0;
    zoomRef.current = zoom;

    // 중심 0.05°·줌 0.25 단위 양자화 — 동일 값이면 React가 리렌더를 생략한다.
    const quantized = {
      latitude: Math.round(camera.latitude / 0.05) * 0.05,
      longitude: Math.round(camera.longitude / 0.05) * 0.05,
      zoom: Math.round(zoom / 0.25) * 0.25,
    };

    setViewport(prev =>
      prev &&
      prev.latitude === quantized.latitude &&
      prev.longitude === quantized.longitude &&
      prev.zoom === quantized.zoom
        ? prev
        : quantized
    );
  }, []);

  // 첫 onCameraChanged 이전에도 마커가 보이도록 초기 뷰포트를 시드한다.
  // 실제 지도 화면 모서리 좌표(screenToCoordinate)로 복원하는 이유:
  // 화면 재마운트 시 네이티브 지도는 이전 카메라를 유지할 수 있어,
  // initialCamera(전국)로 시드하면 실제 화면과 다른 영역의 마커를 계산하게 된다.
  const handleMapInitialized = useCallback(() => {
    if (!mountedRef.current || !mapRef.current) {
      return;
    }

    const initializedMap = mapRef.current;

    mapReadyRef.current = true;
    setMapReady(true);
    flushPendingCamera();

    const seedViewportFromMap = async () => {
      const isMapActive = () =>
        mountedRef.current &&
        mapReadyRef.current &&
        mapRef.current === initializedMap;

      try {
        const { width, height } = Dimensions.get('window');
        const topLeft = await initializedMap.screenToCoordinate({
          screenX: 0,
          screenY: 0,
        });

        if (!isMapActive()) {
          return;
        }

        const bottomRight = await initializedMap.screenToCoordinate({
          screenX: width,
          screenY: height,
        });

        if (!isMapActive()) {
          return;
        }

        if (topLeft?.isValid && bottomRight?.isValid) {
          const latSpan = Math.abs(topLeft.latitude - bottomRight.latitude);
          const zoom = deltaToZoom(latSpan);

          setViewport(prev =>
            prev
              ? prev
              : {
                  latitude: (topLeft.latitude + bottomRight.latitude) / 2,
                  longitude: (topLeft.longitude + bottomRight.longitude) / 2,
                  zoom,
                }
          );

          return;
        }

        // 프로젝션이 아직 준비 전이면 초기 카메라(전국)로 폴백 — 이후 onCameraChanged가 보정한다.
        setViewport(prev =>
          prev
            ? prev
            : {
                latitude: KOREA_CAMERA.latitude,
                longitude: KOREA_CAMERA.longitude,
                zoom: KOREA_CAMERA.zoom ?? 0,
              }
        );
      } catch {
        return;
      }
    };

    void seedViewportFromMap();
  }, [flushPendingCamera]);

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
        onInitialized={handleMapInitialized}
        onTapMap={handleTapMap}
        onCameraChanged={handleCameraChanged}
      >
        <CampSiteMapMarkersView
          campSiteMap={campSiteMap}
          viewport={viewport}
          onTapSpot={handleMarkerTap}
        />
      </NaverMapView>

      {/* A: 선택 박지 강조 펄스(화면 중앙 = 카메라 이징이 옮긴 위치). pointerEvents none. */}
      <CampSiteSelectedPulseView campSiteMap={campSiteMap} />

      <CampSiteMapTopOverlayView
        campSiteMap={campSiteMap}
        onSelectResult={handleSelectResult}
        onOpenFavorites={handleOpenFavorites}
      />

      <CampSiteMapBottomOverlayView
        bottomClearance={bottomClearance}
        locationGranted={locationGranted}
        onMoveToCurrentLocation={handleMoveToCurrentLocation}
      />

      {/* 즐겨찾기 리스트 시트(CS-9) — 항목 탭 시 마커 탭과 동일한 카메라 이동 + 상세 흐름. */}
      <CampSiteFavoritesSheetView
        visible={favoritesVisible}
        spots={campSiteMap.getFavoriteSpots()}
        onClose={() => setFavoritesVisible(false)}
        onSelect={handleSelectFavorite}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
});

export default CampSiteMapView;
