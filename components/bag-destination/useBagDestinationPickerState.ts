import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import {
  Camera,
  CameraChangeReason,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import geocodeService, {
  FALLBACK_LOCATION_NAME,
} from '@/model/bag-destination/GeocodeService';
import {
  Coordinate,
  getDistanceInMeters,
} from '@/model/bag-destination/GeoDistance';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { CampSiteMapViewport } from '@/components/camp-site/CampSiteMapMarkersView';
import { deltaToZoom } from '@/model/map/MapZoom';

// 저장된 여행지도 없고 위치 권한도 없을 때의 기본 중심(DST-3).
const SEOUL_CITY_HALL: Coordinate = { latitude: 37.5665, longitude: 126.978 };

const PICKED_ZOOM = deltaToZoom(0.02);
const DEFAULT_ZOOM = deltaToZoom(0.05);

// 박지 선택 후 제스처로 이만큼 넘게 벗어나면 자유 위치 모드로 돌린다(DST-3).
const SPOT_RELEASE_METERS = 100;
// 같은 지점으로 볼 거리 — 박지·장소 중복 제거(DST-4)와 알려진 이름 재사용에 쓴다.
const SAME_PLACE_METERS = 100;
// 이 거리 미만의 중심 변화는 무시한다 — 네이티브 지도가 리렌더 때마다 부동소수점 수준으로
// 미세하게 다른 카메라를 onCameraChanged로 되쏘는데, 정확 비교(===)면 그때마다 center가
// 갱신되고 역지오코딩 이펙트(center dep)가 재실행 → 다시 리렌더 → 재발화로 무한 루프가 된다.
const CENTER_SETTLE_METERS = 1;
// 역지오코딩 이펙트가 반응하는 중심 양자화 단위(약 55m). center를 직접 dep로 쓰면 위 미세
// 진동을 setCenter 임계값이 다 못 막을 때(진동 폭이 그보다 클 때) 이펙트가 계속 재실행돼
// 무한 루프가 된다. 양자화 값에만 반응시켜 흡수한다 — 역지오코딩은 주소 수준이라 오차 무의미.
const GEO_QUANTIZE_DEGREE = 0.0005;

const MIN_QUERY_LENGTH = 2;
const PLACE_SEARCH_DEBOUNCE_MS = 400;
const REVERSE_GEOCODE_DEBOUNCE_MS = 500;
const MAP_READY_FALLBACK_MAX_FRAMES = 3;

// 이미 허용된 권한만 확인한다 — 선택기를 여는 것만으로 권한을 새로 요청하지 않는다(DST-3).
const getGrantedPosition = async (): Promise<Coordinate | null> => {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();

    if (!granted) {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({});

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.error('현재 위치 조회 실패:', error);

    return null;
  }
};

interface Params {
  currentLocation: BagLocation | null;
  visible: boolean;
  onConfirm: (location: BagLocation) => Promise<void>;
  onClose: () => void;
  onDone: (() => void) | undefined;
  campSiteMap: CampSiteMap;
  isMapSupported: boolean;
  mapRef: React.RefObject<NaverMapViewRef | null>;
}

interface PendingCameraTarget extends Coordinate {
  visibleGeneration: number;
}

// 공용 여행지 선택기(DST-3/DST-4)의 상태·핸들러. 뷰는 조립만 담당한다.
// 호출하는 컴포넌트가 observer라 여기서 읽는 CampSiteMap의 observable도 함께 추적된다.
const useBagDestinationPickerState = ({
  currentLocation,
  visible,
  onConfirm,
  onClose,
  onDone,
  campSiteMap,
  isMapSupported,
  mapRef,
}: Params) => {
  // 지도는 origin이 정해진 뒤에만 마운트한다 — initialCamera를 한 번만 확정해
  // 카메라 재적용으로 인한 이동 루프를 막는다.
  const [origin, setOrigin] = useState<Camera | null>(null);
  const [center, setCenter] = useState<Coordinate>(SEOUL_CITY_HALL);
  const [viewport, setViewport] = useState<CampSiteMapViewport | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<CampSpot | null>(null);
  const [selectedCampLocation, setSelectedCampLocation] =
    useState<BagLocation | null>(null);
  const [addressName, setAddressName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<GeocodeResult[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  // 지도를 탭해 결과만 닫은 상태(검색어는 유지, DST-4).
  const [resultsDismissed, setResultsDismissed] = useState(false);

  // 저장/검색으로 이름을 이미 아는 좌표. 이 근처에선 역지오코딩 대신 이 이름을 쓴다.
  const knownRef = useRef<(Coordinate & { name: string }) | null>(null);
  const selectedCampLocationRef = useRef<BagLocation | null>(null);
  const mountedRef = useRef(true);
  const visibleGenerationRef = useRef(0);
  const previousVisibleRef = useRef(visible);
  const visibleRef = useRef(visible);
  const userInteractionRef = useRef(0);
  const savingRef = useRef(false);
  const mapReadyRef = useRef(false);
  const mapReadyGenerationRef = useRef<number | null>(null);
  const pendingCameraTargetRef = useRef<PendingCameraTarget | null>(null);
  const pendingCameraFrameRef = useRef<number | null>(null);
  const mapReadyFallbackFrameRef = useRef<number | null>(null);
  // 프롭 변화로 초기화 이펙트가 다시 돌지 않도록(열릴 때 1회만 읽는다).
  const currentLocationRef = useRef(currentLocation);

  if (previousVisibleRef.current !== visible) {
    previousVisibleRef.current = visible;
    visibleGenerationRef.current += 1;
  }

  visibleRef.current = visible;
  currentLocationRef.current = currentLocation;

  const mapGeneration = visibleGenerationRef.current;

  const cancelMapReadyFallback = useCallback(() => {
    if (mapReadyFallbackFrameRef.current !== null) {
      cancelAnimationFrame(mapReadyFallbackFrameRef.current);
      mapReadyFallbackFrameRef.current = null;
    }
  }, []);

  const resetMapCommandState = useCallback(() => {
    if (pendingCameraFrameRef.current !== null) {
      cancelAnimationFrame(pendingCameraFrameRef.current);
      pendingCameraFrameRef.current = null;
    }

    cancelMapReadyFallback();
    mapReadyRef.current = false;
    mapReadyGenerationRef.current = null;
    pendingCameraTargetRef.current = null;
  }, [cancelMapReadyFallback]);

  const animateCamera = useCallback(
    (target: Coordinate) => {
      mapRef.current?.animateCameraTo({
        latitude: target.latitude,
        longitude: target.longitude,
        zoom: PICKED_ZOOM,
        duration: 400,
      });
    },
    [mapRef]
  );

  const schedulePendingCamera = useCallback(
    (visibleGeneration: number) => {
      const pending = pendingCameraTargetRef.current;

      if (
        !pending ||
        pending.visibleGeneration !== visibleGeneration ||
        pendingCameraFrameRef.current !== null
      ) {
        return;
      }

      pendingCameraFrameRef.current = requestAnimationFrame(() => {
        pendingCameraFrameRef.current = null;

        const pending = pendingCameraTargetRef.current;

        if (!pending || pending.visibleGeneration !== visibleGeneration) {
          return;
        }

        if (
          !mountedRef.current ||
          savingRef.current ||
          !visibleRef.current ||
          visibleGenerationRef.current !== visibleGeneration ||
          !mapReadyRef.current ||
          mapReadyGenerationRef.current !== visibleGeneration ||
          !mapRef.current
        ) {
          return;
        }

        pendingCameraTargetRef.current = null;
        animateCamera(pending);
      });
    },
    [animateCamera, mapRef]
  );

  const handleMapInitialized = useCallback(() => {
    if (
      !mountedRef.current ||
      !visibleRef.current ||
      visibleGenerationRef.current !== mapGeneration
    ) {
      return;
    }

    cancelMapReadyFallback();
    mapReadyRef.current = true;
    mapReadyGenerationRef.current = mapGeneration;
    schedulePendingCamera(mapGeneration);
  }, [cancelMapReadyFallback, mapGeneration, schedulePendingCamera]);

  const markUserInteraction = useCallback((): number => {
    userInteractionRef.current += 1;

    return userInteractionRef.current;
  }, []);

  const isCurrentVisibleGeneration = useCallback(
    (visibleGeneration: number): boolean => {
      return (
        mountedRef.current &&
        visibleRef.current &&
        visibleGenerationRef.current === visibleGeneration
      );
    },
    []
  );

  const isCurrentInteraction = useCallback(
    (visibleGeneration: number, userInteraction: number): boolean => {
      return (
        isCurrentVisibleGeneration(visibleGeneration) &&
        userInteractionRef.current === userInteraction
      );
    },
    [isCurrentVisibleGeneration]
  );

  const ensureOrigin = useCallback((target: Coordinate) => {
    const camera = { ...target, zoom: PICKED_ZOOM };

    setOrigin(prev => prev ?? camera);
    setViewport(prev => prev ?? camera);
  }, []);

  const selectCampLocation = useCallback(
    (location: BagLocation | null, spot: CampSpot | null) => {
      selectedCampLocationRef.current = location;
      setSelectedCampLocation(location);
      setSelectedSpot(spot);
    },
    []
  );

  const selectSpot = useCallback((spot: CampSpot) => {
    const location = {
      name: spot.name,
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
      campSpotId: spot.id,
    };

    selectedCampLocationRef.current = location;
    setSelectedCampLocation(location);
    setSelectedSpot(spot);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      resetMapCommandState();
    };
  }, [resetMapCommandState]);

  useEffect(() => {
    if (visible && !saving) {
      void campSiteMap.initialize();
    }
  }, [campSiteMap, saving, visible]);

  // 열릴 때 초기 중심을 확정하고, 닫히면 지도를 내려 다음 열기에 다시 잡게 한다.
  useEffect(() => {
    const visibleGeneration = mapGeneration;

    resetMapCommandState();
    userInteractionRef.current = 0;

    if (!visible) {
      setOrigin(null);
      setViewport(null);
      setLocating(false);

      return;
    }

    let cancelled = false;

    const prepare = async () => {
      const saved = currentLocationRef.current;
      const initialInteraction = userInteractionRef.current;

      setQuery('');
      setPlaceResults([]);
      setResultsDismissed(false);
      setResolving(false);
      selectCampLocation(
        saved?.campSpotId ? saved : null,
        null
      );

      // 저장된 여행지가 있으면 그 좌표로 연다(지도 범위 밖이어도 그대로 쓴다).
      if (saved) {
        const start = { latitude: saved.latitude, longitude: saved.longitude };

        knownRef.current = { ...start, name: saved.name };
        setCenter(start);
        setAddressName(saved.name);
        setOrigin({ ...start, zoom: PICKED_ZOOM });
        setViewport({ ...start, zoom: PICKED_ZOOM });

        return;
      }

      knownRef.current = null;
      setAddressName('');

      if (!isMapSupported) {
        return;
      }

      const granted = await getGrantedPosition();

      if (
        cancelled ||
        !isCurrentInteraction(visibleGeneration, initialInteraction)
      ) {
        return;
      }

      const start = granted ?? SEOUL_CITY_HALL;
      const zoom = granted ? PICKED_ZOOM : DEFAULT_ZOOM;

      setCenter(start);
      setOrigin({ ...start, zoom });
      setViewport({ ...start, zoom });
    };

    void prepare();

    return () => {
      cancelled = true;
      resetMapCommandState();
    };
  }, [
    visible,
    isMapSupported,
    isCurrentInteraction,
    mapGeneration,
    resetMapCommandState,
    selectCampLocation,
  ]);

  // iOS legacy architecture에서 onInitialized가 유실돼도, 지도 ref 커밋 뒤
  // 프로그램 카메라 명령을 실행할 수 있도록 짧게 readiness를 확인한다.
  useEffect(() => {
    const visibleGeneration = mapGeneration;

    if (
      !visible ||
      !origin ||
      saving ||
      (mapReadyRef.current &&
        mapReadyGenerationRef.current === visibleGeneration)
    ) {
      cancelMapReadyFallback();

      return;
    }

    let cancelled = false;
    let attempts = 0;

    const checkMapReady = () => {
      mapReadyFallbackFrameRef.current = requestAnimationFrame(() => {
        mapReadyFallbackFrameRef.current = null;

        if (
          cancelled ||
          !mountedRef.current ||
          savingRef.current ||
          !visibleRef.current ||
          visibleGenerationRef.current !== visibleGeneration
        ) {
          return;
        }

        if (mapRef.current) {
          mapReadyRef.current = true;
          mapReadyGenerationRef.current = visibleGeneration;
          schedulePendingCamera(visibleGeneration);

          return;
        }

        attempts += 1;

        if (attempts < MAP_READY_FALLBACK_MAX_FRAMES) {
          checkMapReady();
        }
      });
    };

    checkMapReady();

    return () => {
      cancelled = true;
      cancelMapReadyFallback();
    };
  }, [
    cancelMapReadyFallback,
    mapGeneration,
    mapRef,
    origin,
    saving,
    schedulePendingCamera,
    visible,
  ]);

  // 저장된 여행지의 박지 링크 복원(DST-3) — 박지 목록이 로드된 뒤 매칭한다.
  // 삭제·비활성·로드 실패여도 저장된 스냅샷 자체가 박지 선택 모드를 유지한다(DST-7).
  const savedCampSpotId = currentLocation?.campSpotId ?? null;
  const linkedSpot = savedCampSpotId
    ? campSiteMap.getSpotById(savedCampSpotId)
    : null;

  useEffect(() => {
    if (
      !visible ||
      savingRef.current ||
      userInteractionRef.current > 0 ||
      !linkedSpot ||
      selectedCampLocationRef.current?.campSpotId !== linkedSpot.id
    ) {
      return;
    }

    selectSpot(linkedSpot);
  }, [visible, linkedSpot, saving, selectSpot]);

  // 자유 위치 모드에서만 지도 중심 주소를 미리 본다. 박지 모드는 박지명을 그대로 쓴다.
  // 역지오코딩 이펙트가 반응할 양자화 중심(약 55m). 미세 진동을 흡수해 무한 루프를 막는다.
  const geoLat =
    Math.round(center.latitude / GEO_QUANTIZE_DEGREE) * GEO_QUANTIZE_DEGREE;
  const geoLng =
    Math.round(center.longitude / GEO_QUANTIZE_DEGREE) * GEO_QUANTIZE_DEGREE;

  useEffect(() => {
    if (!visible || !origin || selectedCampLocation) {
      return;
    }

    const known = knownRef.current;

    if (known && getDistanceInMeters(known, center) <= SAME_PLACE_METERS) {
      setAddressName(known.name);
      setResolving(false);

      return;
    }

    let cancelled = false;

    setResolving(true);

    const timer = setTimeout(async () => {
      try {
        const name = await geocodeService.reverseGeocode(
          center.latitude,
          center.longitude
        );

        if (!cancelled) {
          setAddressName(name);
        }
      } catch (error) {
        console.error('역지오코딩 실패:', error);

        // 이름을 못 찾아도 확정은 가능하다 — 확정 시 폴백 이름으로 저장한다(DST-3).
        if (!cancelled) {
          setAddressName('');
        }
      } finally {
        if (!cancelled) {
          setResolving(false);
        }
      }
    }, REVERSE_GEOCODE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // center 대신 양자화 값(geoLat/geoLng)에 반응한다 — 무한 루프 방지(GEO_QUANTIZE_DEGREE 주석).
    // 본문은 정확한 center를 쓰지만 양자화 단위(약 55m) 내 오차라 역지오코딩 결과에 영향 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, origin, selectedCampLocation, geoLat, geoLng]);

  // 카카오 장소 검색만 디바운스한다(DST-4) — 박지는 이미 로드된 목록이라 즉시 필터한다.
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setPlaceResults([]);
      setSearchingPlaces(false);

      return;
    }

    let cancelled = false;

    setSearchingPlaces(true);

    const timer = setTimeout(async () => {
      try {
        const found = await geocodeService.geocode(trimmed);

        if (!cancelled) {
          setPlaceResults(found);
        }
      } catch (error) {
        // 장소 검색이 실패해도 박지 결과는 그대로 표시한다(DST-4).
        console.error('장소 검색 실패:', error);

        if (!cancelled) {
          setPlaceResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingPlaces(false);
        }
      }
    }, PLACE_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;
  // 렌더 중에 읽어 박지 로드 완료 시에도 결과가 갱신되게 한다(observer가 추적).
  // 박지 데이터 로드가 실패하면 빈 배열이 되고 장소 검색·자유 핀은 그대로 쓸 수 있다(DST-4).
  const spotResults = hasQuery ? campSiteMap.searchSpotsBy(trimmedQuery) : [];

  // 이름이 같고 100m 이내인 장소는 제거한다 — 박지 연결·상세가 가능한 쪽을 남긴다(DST-4).
  const visiblePlaceResults = hasQuery
    ? placeResults.filter(
        place =>
          !campSiteMap.getSpotsByName(place.name).some(
            spot =>
              getDistanceInMeters(spot.location, place) <= SAME_PLACE_METERS
          )
      )
    : [];

  const resultsVisible = hasQuery && !resultsDismissed;

  const moveCamera = useCallback(
    (target: Coordinate) => {
      if (!mountedRef.current || !visibleRef.current || savingRef.current) {
        return;
      }

      const visibleGeneration = visibleGenerationRef.current;

      pendingCameraTargetRef.current = {
        ...target,
        visibleGeneration,
      };

      if (
        mapReadyRef.current &&
        mapReadyGenerationRef.current === visibleGeneration
      ) {
        schedulePendingCamera(visibleGeneration);
      }
    },
    [schedulePendingCamera]
  );

  const handleCameraChanged = useCallback(
    (camera: Camera & { reason: CameraChangeReason }) => {
      if (savingRef.current) {
        return;
      }

      const next = {
        latitude: camera.latitude,
        longitude: camera.longitude,
      };

      if (camera.reason === 'Gesture') {
        if (pendingCameraFrameRef.current !== null) {
          cancelAnimationFrame(pendingCameraFrameRef.current);
          pendingCameraFrameRef.current = null;
        }

        pendingCameraTargetRef.current = null;
        markUserInteraction();

        // 미세 변화는 무시해 center를 안정시킨다 — 무한 리렌더 방지(CENTER_SETTLE_METERS 주석 참고).
        setCenter(prev =>
          getDistanceInMeters(prev, next) < CENTER_SETTLE_METERS ? prev : next
        );
      }

      // 중심 0.05°·줌 0.25 단위 양자화 — 값이 같으면 마커 레이어가 리렌더되지 않는다.
      const quantized = {
        latitude: Math.round(next.latitude / 0.05) * 0.05,
        longitude: Math.round(next.longitude / 0.05) * 0.05,
        zoom: Math.round((camera.zoom ?? 0) / 0.25) * 0.25,
      };

      setViewport(prev =>
        prev &&
        prev.latitude === quantized.latitude &&
        prev.longitude === quantized.longitude &&
        prev.zoom === quantized.zoom
          ? prev
          : quantized
      );

      const campLocation = selectedCampLocationRef.current;

      if (camera.reason === 'Gesture' && !campLocation) {
        const known = knownRef.current;

        if (!known || getDistanceInMeters(known, next) > SAME_PLACE_METERS) {
          knownRef.current = null;
          setAddressName('');
        }
      }

      // 사용자가 직접 끌어 박지에서 멀어질 때만 링크를 놓는다 —
      // 검색 결과 선택 등 카메라 애니메이션(Developer)으로는 선택이 풀리지 않는다(DST-3).
      if (
        camera.reason === 'Gesture' &&
        campLocation &&
        getDistanceInMeters(campLocation, next) > SPOT_RELEASE_METERS
      ) {
        knownRef.current = null;
        setAddressName('');
        selectCampLocation(null, null);
      }
    },
    [markUserInteraction, selectCampLocation]
  );

  // 박지 마커·박지 검색 결과 선택 → 박지 선택 모드(DST-3/DST-4).
  const handleSelectSpot = useCallback(
    (spot: CampSpot) => {
      if (savingRef.current) {
        return;
      }

      Keyboard.dismiss();

      markUserInteraction();
      knownRef.current = null;
      setResultsDismissed(true);
      selectSpot(spot);
      setCenter(spot.location);
      ensureOrigin(spot.location);
      moveCamera(spot.location);
    },
    [ensureOrigin, markUserInteraction, moveCamera, selectSpot]
  );

  // 카카오 장소 선택 → 자유 위치 모드. 기존 박지 링크는 여기서 풀린다(DST-7).
  const handleSelectPlace = useCallback(
    (place: GeocodeResult) => {
      if (savingRef.current) {
        return;
      }

      Keyboard.dismiss();

      const target = { latitude: place.latitude, longitude: place.longitude };

      markUserInteraction();
      knownRef.current = { ...target, name: place.name };
      setResultsDismissed(true);
      selectCampLocation(null, null);
      setAddressName(place.name);
      setCenter(target);
      ensureOrigin(target);
      moveCamera(target);
    },
    [ensureOrigin, markUserInteraction, moveCamera, selectCampLocation]
  );

  const handleChangeQuery = useCallback((value: string) => {
    if (savingRef.current) {
      return;
    }

    setQuery(value);
    setPlaceResults([]);
    setSearchingPlaces(value.trim().length >= MIN_QUERY_LENGTH);
    setResultsDismissed(false);
  }, []);

  const handleFocusSearch = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    setResultsDismissed(false);
    void campSiteMap.initialize();
  }, [campSiteMap]);

  // 지우기: 검색어와 양쪽 결과를 모두 초기화한다(DST-4).
  const handleClearQuery = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    setQuery('');
    setPlaceResults([]);
    setSearchingPlaces(false);
    setResultsDismissed(false);
  }, []);

  // 지도 탭: 결과와 키보드만 닫고 검색어는 유지한다(DST-4).
  const handleTapMap = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    Keyboard.dismiss();
    markUserInteraction();
    setResultsDismissed(true);
  }, [markUserInteraction]);

  // 현재 위치 버튼에서만 권한을 요청한다(DST-3).
  const handleMoveToCurrentLocation = useCallback(async () => {
    if (!isMapSupported || savingRef.current || locating) {
      return;
    }

    const visibleGeneration = visibleGenerationRef.current;
    const userInteraction = userInteractionRef.current;

    setLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (
        savingRef.current ||
        !isCurrentInteraction(visibleGeneration, userInteraction)
      ) {
        return;
      }

      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '현재 위치를 사용하려면 위치 권한을 허용해주세요.'
        );

        return;
      }

      const position = await Location.getCurrentPositionAsync({});

      const target = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (
        savingRef.current ||
        !isCurrentInteraction(visibleGeneration, userInteraction)
      ) {
        return;
      }

      markUserInteraction();

      Keyboard.dismiss();

      // 현재 위치는 실제 주소를 역지오코딩하도록 알려진 이름을 비운다.
      knownRef.current = null;
      setResultsDismissed(true);
      selectCampLocation(null, null);
      setAddressName('');
      setCenter(target);
      ensureOrigin(target);
      moveCamera(target);
    } catch (error) {
      if (
        savingRef.current ||
        !isCurrentInteraction(visibleGeneration, userInteraction)
      ) {
        return;
      }

      console.error('현재 위치 이동 실패:', error);
      Alert.alert('오류', '현재 위치를 불러오지 못했습니다.');
    } finally {
      if (
        mountedRef.current &&
        visibleGenerationRef.current === visibleGeneration
      ) {
        setLocating(false);
      }
    }
  }, [
    ensureOrigin,
    isMapSupported,
    isCurrentInteraction,
    locating,
    markUserInteraction,
    moveCamera,
    selectCampLocation,
  ]);

  // 확정할 여행지. 박지 모드는 참조 + 이름·좌표 스냅샷, 자유 위치는 참조 없이 저장한다(DST-1).
  const buildLocation = useCallback(async (): Promise<BagLocation> => {
    const campLocation = selectedCampLocationRef.current;

    if (campLocation) {
      return campLocation;
    }

    if (addressName) {
      return { name: addressName, ...center };
    }

    // 주소를 아직/끝내 못 찾았어도 확정은 막지 않는다(DST-3).
    try {
      const name = await geocodeService.reverseGeocode(
        center.latitude,
        center.longitude
      );

      return { name: name || FALLBACK_LOCATION_NAME, ...center };
    } catch (error) {
      console.error('역지오코딩 실패:', error);

      return { name: FALLBACK_LOCATION_NAME, ...center };
    }
  }, [addressName, center]);

  const handleConfirm = useCallback(async () => {
    // 첫 저장이 끝나기 전 추가 탭은 무시한다(DST-6).
    if (savingRef.current || !origin) {
      return;
    }

    const visibleGeneration = visibleGenerationRef.current;

    if (!isCurrentVisibleGeneration(visibleGeneration)) {
      return;
    }

    savingRef.current = true;

    cancelMapReadyFallback();

    if (pendingCameraFrameRef.current !== null) {
      cancelAnimationFrame(pendingCameraFrameRef.current);
      pendingCameraFrameRef.current = null;
    }

    if (
      visibleRef.current &&
      mapReadyRef.current &&
      mapReadyGenerationRef.current === visibleGeneration
    ) {
      mapRef.current?.cancelAnimation();
    }

    setSaving(true);

    let completed = false;

    try {
      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      const location = await buildLocation();

      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      await onConfirm(location);

      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      onDone?.();
      onClose();
      completed = true;
    } catch (error) {
      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      // 저장 실패 시 선택기를 닫지 않고 재시도할 수 있게 한다(DST-6).
      console.error('여행지 저장 실패:', error);
      Alert.alert('오류', '여행지를 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }

      if (!completed && isCurrentVisibleGeneration(visibleGeneration)) {
        schedulePendingCamera(visibleGeneration);
      }
    }
  }, [
    buildLocation,
    cancelMapReadyFallback,
    isCurrentVisibleGeneration,
    mapRef,
    onClose,
    onConfirm,
    onDone,
    origin,
    schedulePendingCamera,
  ]);

  return {
    origin,
    viewport,
    selectedSpot,
    selectedCampLocation,
    addressName,
    resolving,
    saving,
    locating,
    query,
    spotResults,
    placeResults: visiblePlaceResults,
    searchingPlaces,
    resultsVisible,
    handleMapInitialized,
    handleCameraChanged,
    handleSelectSpot,
    handleSelectPlace,
    handleChangeQuery,
    handleFocusSearch,
    handleClearQuery,
    handleTapMap,
    handleMoveToCurrentLocation,
    handleConfirm,
  };
};

export default useBagDestinationPickerState;
