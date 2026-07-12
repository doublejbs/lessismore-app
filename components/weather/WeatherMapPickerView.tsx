import { FC, useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  Keyboard,
  Alert,
  Pressable,
} from 'react-native';
import {
  NaverMapView,
  NaverMapViewRef,
  Camera,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import weatherService from '@/model/weather/WeatherService';
import { GeocodeResult } from '@/model/weather/WeatherTypes';
import { deltaToZoom } from '@/model/map/MapZoom';

interface Props {
  bagWeather: BagWeather;
  visible: boolean;
  onClose: () => void;
}

// 위치 미설정 시 기본 중심(서울 시청).
const DEFAULT = {
  latitude: 37.5665,
  longitude: 126.978,
};

// 저장/검색으로 이름을 이미 아는 좌표인지 판정(약 100m 이내면 같은 지점으로 본다).
const EPSILON = 0.001;
const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;

const WeatherMapPickerView: FC<Props> = ({ bagWeather, visible, onClose }) => {
  const mapRef = useRef<NaverMapViewRef>(null);
  // 저장/검색으로 이름을 확정한 좌표. 이 좌표 위에선 역지오코딩 대신 이 이름을 쓴다.
  const knownRef = useRef<{ lat: number; lng: number; name: string } | null>(
    null
  );

  const [center, setCenter] = useState({
    latitude: DEFAULT.latitude,
    longitude: DEFAULT.longitude,
  });
  const [addressName, setAddressName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  // 지도를 다시 그려 initialRegion을 재적용하기 위한 remount 키.
  const [mapKey, setMapKey] = useState(0);

  // 지도 내 지명 검색.
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);

  // 지도를 초기에 어디로 띄울지: 저장된 위치가 있으면 그 좌표, 없으면 기본값.
  const location = bagWeather.getLocation();
  const initialCamera: Camera = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: deltaToZoom(0.02),
      }
    : {
        latitude: DEFAULT.latitude,
        longitude: DEFAULT.longitude,
        zoom: deltaToZoom(0.05),
      };

  // 모달이 열릴 때마다 저장된 위치 기준으로 초기화한다.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const loc = bagWeather.getLocation();
    if (loc) {
      knownRef.current = { lat: loc.latitude, lng: loc.longitude, name: loc.name };
      setCenter({ latitude: loc.latitude, longitude: loc.longitude });
      setAddressName(loc.name);
    } else {
      knownRef.current = null;
      setCenter({ latitude: DEFAULT.latitude, longitude: DEFAULT.longitude });
      setAddressName('');
    }
    setResolving(false);
    setQuery('');
    setResults([]);
    setMapKey(k => k + 1);
  }, [visible, bagWeather]);

  // 지도 중심 이동 시 디바운스 역지오코딩으로 주소 미리보기.
  // 단, 저장/검색으로 이름을 이미 아는 좌표면 그 이름을 그대로 쓴다.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const known = knownRef.current;
    if (known && near(center.latitude, known.lat) && near(center.longitude, known.lng)) {
      setAddressName(known.name);
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    const timer = setTimeout(async () => {
      try {
        const name = await weatherService.reverseGeocode(
          center.latitude,
          center.longitude
        );
        if (!cancelled) {
          setAddressName(name);
        }
      } catch {
        if (!cancelled) {
          setAddressName('');
        }
      } finally {
        if (!cancelled) {
          setResolving(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [center.latitude, center.longitude, visible]);

  // 검색어 디바운스 후 지오코딩.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await bagWeather.searchLocations(trimmed);
        if (!cancelled) {
          setResults(found);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, bagWeather]);

  const handleSelectResult = (result: GeocodeResult) => {
    Keyboard.dismiss();
    knownRef.current = {
      lat: result.latitude,
      lng: result.longitude,
      name: result.name,
    };
    setQuery('');
    setResults([]);
    setAddressName(result.name);
    setCenter({ latitude: result.latitude, longitude: result.longitude });
    mapRef.current?.animateCameraTo({
      latitude: result.latitude,
      longitude: result.longitude,
      zoom: deltaToZoom(0.02),
      duration: 400,
    });
  };

  const handleCurrentLocation = async () => {
    if (locating) {
      return;
    }
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '현재 위치를 사용하려면 위치 권한을 허용해주세요.'
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;
      // 현재 위치는 실제 주소를 역지오코딩하도록 알려진 이름을 비운다.
      knownRef.current = null;
      Keyboard.dismiss();
      setQuery('');
      setResults([]);
      setCenter({ latitude, longitude });
      mapRef.current?.animateCameraTo({
        latitude,
        longitude,
        zoom: deltaToZoom(0.02),
        duration: 400,
      });
    } catch (error) {
      console.error('현재 위치 조회 실패:', error);
      Alert.alert('오류', '현재 위치를 불러오지 못했습니다.');
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      const name =
        addressName ||
        (await weatherService.reverseGeocode(
          center.latitude,
          center.longitude
        ));
      await bagWeather.updateLocation({
        name,
        latitude: center.latitude,
        longitude: center.longitude,
      });
      onClose();
    } catch {
      // 저장 실패 시 모달 유지
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      onRequestClose={onClose}
      presentationStyle='fullScreen'
    >
      <SafeAreaProvider>
        <View style={styles.container}>
          <NaverMapView
            key={mapKey}
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialCamera={initialCamera}
            // 기본 줌 버튼/스케일바/현위치 버튼은 기존 피커 UI 톤과 달라 숨긴다.
            isShowLocationButton={false}
            isShowZoomControls={false}
            isShowScaleBar={false}
            onCameraChanged={camera =>
              setCenter({
                latitude: camera.latitude,
                longitude: camera.longitude,
              })
            }
          />

          {/* 중앙 고정 핀(지도를 움직여 중심을 맞춘다) */}
          <View style={styles.centerPin} pointerEvents='none'>
            <Ionicons
              name='location'
              size={40}
              color={Color.textPrimary}
              style={styles.pinIcon}
            />
          </View>

          {/* 검색 결과가 떠 있을 때 지도(바깥) 탭으로 닫는다. */}
          {results.length > 0 && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                Keyboard.dismiss();
                setQuery('');
                setResults([]);
              }}
            />
          )}

          <SafeAreaView edges={['top']} style={styles.headerWrap}>
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={onClose}
                  hitSlop={8}
                >
                  <Ionicons name='close' size={24} color={Color.textPrimary} />
                </TouchableOpacity>
                <PretendardText style={styles.headerTitle} weight='bold'>
                  지도에서 위치 선택
                </PretendardText>
                <View style={styles.headerButton} />
              </View>

              <View style={styles.searchBox}>
                <Ionicons
                  name='search'
                  size={18}
                  color={Color.textSecondary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder='여행지를 검색하세요 (예: 북한산)'
                  placeholderTextColor={Color.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                  returnKeyType='search'
                />
                {searching ? (
                  <ActivityIndicator size='small' color={Color.textSecondary} />
                ) : query.length > 0 ? (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                    <Ionicons
                      name='close-circle'
                      size={18}
                      color={Color.textSecondary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {results.length > 0 && (
              <View style={styles.resultsCard}>
                <FlatList
                  data={results}
                  keyboardShouldPersistTaps='handled'
                  keyboardDismissMode='on-drag'
                  showsVerticalScrollIndicator={false}
                  keyExtractor={(item, index) =>
                    `${item.latitude},${item.longitude},${index}`
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.resultRow}
                      onPress={() => handleSelectResult(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name='location-outline'
                        size={18}
                        color={Color.textSecondary}
                      />
                      <View style={styles.resultTextWrap}>
                        <PretendardText
                          style={styles.resultText}
                          weight='medium'
                        >
                          {item.name}
                        </PretendardText>
                        {item.subtitle && (
                          <PretendardText style={styles.resultSubtitle}>
                            {item.subtitle}
                          </PretendardText>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </SafeAreaView>

          <SafeAreaView edges={['bottom']} style={styles.bottomWrap}>
            <View style={styles.locateRow}>
              <TouchableOpacity
                style={styles.locateButton}
                onPress={handleCurrentLocation}
                disabled={locating}
                activeOpacity={0.8}
              >
                {locating ? (
                  <ActivityIndicator size='small' color={Color.textPrimary} />
                ) : (
                  <Ionicons
                    name='locate'
                    size={22}
                    color={Color.textPrimary}
                  />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.bottomPanel}>
              <View style={styles.addressRow}>
                <Ionicons
                  name='location-outline'
                  size={18}
                  color={Color.textPrimary}
                />
                <PretendardText
                  style={styles.addressText}
                  weight='medium'
                  numberOfLines={2}
                >
                  {resolving
                    ? '위치 확인 중…'
                    : addressName || '주소를 찾을 수 없어요'}
                </PretendardText>
              </View>
              <TouchableOpacity
                style={[styles.confirmButton, saving && styles.confirmDisabled]}
                onPress={handleConfirm}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={Color.background} />
                ) : (
                  <PretendardText style={styles.confirmText} weight='semibold'>
                    이 위치로 설정
                  </PretendardText>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  centerPin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 핀 끝(하단)이 지도 중심에 오도록 위로 들어올린다.
  pinIcon: {
    marginBottom: 40,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerCard: {
    margin: 12,
    padding: 12,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
  },
  headerButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  resultsCard: {
    marginHorizontal: 12,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
    maxHeight: 260,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  resultTextWrap: {
    flex: 1,
    gap: 2,
  },
  resultText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  resultSubtitle: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  bottomWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  locateRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 10,
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
  bottomPanel: {
    margin: 16,
    padding: 16,
    borderRadius: Radius.modal,
    backgroundColor: Color.background,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: Color.textPrimary,
    lineHeight: 20,
  },
  confirmButton: {
    height: 52,
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default WeatherMapPickerView;
