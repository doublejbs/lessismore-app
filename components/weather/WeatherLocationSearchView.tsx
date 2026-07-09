import { FC, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import { GeocodeResult } from '@/model/weather/WeatherTypes';
import WeatherMapPickerView from './WeatherMapPickerView';

interface Props {
  bagWeather: BagWeather;
  onDone?: () => void;
  // 검색 결과가 떠 있는 동안(true) 부모가 날씨 영역을 숨기고 리스트가 화면을 채우도록.
  onActiveChange?: (active: boolean) => void;
}

const WeatherLocationSearchView: FC<Props> = ({
  bagWeather,
  onDone,
  onActiveChange,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  const hasResults = results.length > 0;
  const location = bagWeather.getLocation();
  const locationName = location?.name ?? '';

  useEffect(() => {
    onActiveChange?.(hasResults);
  }, [hasResults, onActiveChange]);

  // 선택된 위치를 검색창에 표시(위치 카드 + 검색 통합).
  // 위치가 바뀌면 검색어를 그 이름으로 맞추고 결과를 닫는다.
  useEffect(() => {
    setQuery(locationName);
    setResults([]);
  }, [locationName]);

  // 입력 디바운스 후 지오코딩. 이미 선택된 위치명 그대로면 검색하지 않는다.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === locationName) {
      setResults([]);
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
  }, [query, locationName, bagWeather]);

  const handleSelect = async (result: GeocodeResult) => {
    setQuery('');
    setResults([]);
    await bagWeather.updateLocation({
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    onDone?.();
  };

  const handleCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '현재 위치를 사용하려면 위치 권한을 허용해주세요.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = geo[0];
      const name =
        [place?.city, place?.district].filter(Boolean).join(' ') ||
        place?.region ||
        place?.name ||
        '현재 위치';
      await bagWeather.updateLocation({ name, latitude, longitude });
      onDone?.();
    } catch (error) {
      console.error('현재 위치 조회 실패:', error);
      Alert.alert('오류', '현재 위치를 불러오지 못했습니다.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={[styles.container, hasResults && styles.containerFill]}>
      <View style={styles.searchBox}>
        <Ionicons
          name={location ? 'location' : 'search'}
          size={18}
          color={location ? Color.textPrimary : Color.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder='여행지를 검색하세요 (예: 북한산)'
          placeholderTextColor={Color.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
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

      <View style={styles.secondaryRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleCurrentLocation}
          disabled={locating}
          activeOpacity={0.6}
          hitSlop={6}
        >
          {locating ? (
            <ActivityIndicator size='small' color={Color.textSecondary} />
          ) : (
            <Ionicons
              name='locate-outline'
              size={16}
              color={Color.textSecondary}
            />
          )}
          <PretendardText style={styles.secondaryText} weight='medium'>
            현재 위치 사용
          </PretendardText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setMapVisible(true)}
          activeOpacity={0.6}
          hitSlop={6}
        >
          <Ionicons name='map-outline' size={16} color={Color.textSecondary} />
          <PretendardText style={styles.secondaryText} weight='medium'>
            지도에서 선택
          </PretendardText>
        </TouchableOpacity>
      </View>

      <WeatherMapPickerView
        bagWeather={bagWeather}
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
      />

      {hasResults && (
        <FlatList
          style={styles.results}
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
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name='location-outline'
                size={18}
                color={Color.textSecondary}
              />
              <View style={styles.resultTextWrap}>
                <PretendardText style={styles.resultText} weight='medium'>
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  // 검색 결과가 있을 때 남은 공간을 채워서 리스트만 스크롤되게 한다.
  containerFill: {
    flex: 1,
  },
  results: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
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
});

export default observer(WeatherLocationSearchView);
