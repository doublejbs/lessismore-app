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
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import weatherService from '@/model/weather/WeatherService';
import { GeocodeResult } from '@/model/weather/WeatherTypes';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import WeatherMapPickerView from './WeatherMapPickerView';
import CampSpotPickerView from './CampSpotPickerView';

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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [campPickerVisible, setCampPickerVisible] = useState(false);
  // 위치가 있으면 기본은 칩(접힘). "변경"을 누르면 검색 입력을 편다.
  const [editing, setEditing] = useState(false);

  const hasResults = results.length > 0;
  const location = bagWeather.getLocation();
  const locationName = location?.name ?? '';
  // 위치가 없거나(최초 설정) 편집 중이면 검색 입력을 보여준다.
  const showSearch = editing || !location;

  useEffect(() => {
    onActiveChange?.(hasResults);
  }, [hasResults, onActiveChange]);

  // 위치가 확정되면 검색 입력을 접고 초기화한다.
  useEffect(() => {
    if (location) {
      setEditing(false);
      setQuery('');
      setResults([]);
    }
  }, [locationName, location]);

  // 입력 디바운스 후 지오코딩.
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

  const handleSelect = async (result: GeocodeResult) => {
    setQuery('');
    setResults([]);
    // 자유 위치: spotId를 넣지 않아(필드 부재) 기존 박지 링크가 해제된다(WT-2).
    await bagWeather.updateLocation({
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    onDone?.();
  };

  // WT-2 '캠프 박지에서 선택': 박지 좌표·박지명 + spotId로 위치를 저장한다(박지 링크).
  const handleSelectSpot = async (spot: CampSpot) => {
    setCampPickerVisible(false);
    setQuery('');
    setResults([]);
    await bagWeather.updateLocation({
      name: spot.name,
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
      spotId: spot.id,
    });
    onDone?.();
  };

  // 박지 링크(spotId)가 있으면 위치 칩 탭 시 박지 상세로 이동한다(배낭↔박지 상호 이동, WT-2).
  const handleGoToSpot = () => {
    const spotId = location?.spotId;

    if (spotId) {
      router.push(`/camp-site/${spotId}`);
    }
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
      // 지도 선택과 동일하게 Kakao 역지오코딩으로 이름을 통일한다.
      const name = await weatherService.reverseGeocode(latitude, longitude);
      await bagWeather.updateLocation({ name, latitude, longitude });
      onDone?.();
    } catch (error) {
      console.error('현재 위치 조회 실패:', error);
      Alert.alert('오류', '현재 위치를 불러오지 못했습니다.');
    } finally {
      setLocating(false);
    }
  };

  // 접힌 상태: 선택된 위치 칩 + 변경 버튼. 박지 링크면 칩 본문 탭 시 박지 상세로 이동.
  if (!showSearch && location) {
    const isSpotLinked = !!location.spotId;

    return (
      <View style={styles.container}>
        <View style={styles.chip}>
          <TouchableOpacity
            style={styles.chipMain}
            onPress={handleGoToSpot}
            disabled={!isSpotLinked}
            activeOpacity={0.7}
            accessibilityRole={isSpotLinked ? 'button' : undefined}
            accessibilityLabel={
              isSpotLinked ? `${location.name} 박지 상세 보기` : undefined
            }
          >
            {isSpotLinked ? (
              <PretendardText style={styles.pin}>📍</PretendardText>
            ) : (
              <Ionicons name='location' size={18} color={Color.textPrimary} />
            )}
            <PretendardText
              style={styles.chipText}
              weight='medium'
              numberOfLines={1}
            >
              {location.name}
            </PretendardText>
            {isSpotLinked && (
              <Ionicons
                name='chevron-forward'
                size={16}
                color={Color.textSecondary}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
            <PretendardText style={styles.changeText} weight='medium'>
              변경
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, hasResults && styles.containerFill]}>
      <View style={styles.searchBox}>
        <Ionicons name='search' size={18} color={Color.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder='여행지를 검색하세요 (예: 북한산)'
          placeholderTextColor={Color.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoFocus={editing}
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
        ) : location ? (
          <TouchableOpacity
            onPress={() => {
              setEditing(false);
              setQuery('');
              setResults([]);
            }}
            hitSlop={8}
          >
            <PretendardText style={styles.cancelText} weight='medium'>
              취소
            </PretendardText>
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

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCampPickerVisible(true)}
          activeOpacity={0.6}
          hitSlop={6}
        >
          <Ionicons
            name='bonfire-outline'
            size={16}
            color={Color.textSecondary}
          />
          <PretendardText style={styles.secondaryText} weight='medium'>
            캠프 박지에서 선택
          </PretendardText>
        </TouchableOpacity>
      </View>

      <WeatherMapPickerView
        bagWeather={bagWeather}
        visible={mapVisible}
        onClose={() => {
          setMapVisible(false);
          setEditing(false);
        }}
      />

      <CampSpotPickerView
        visible={campPickerVisible}
        onClose={() => setCampPickerVisible(false)}
        onSelect={handleSelectSpot}
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    height: 48,
  },
  // 칩 본문(아이콘·위치명·화살표) — 박지 링크면 이 영역이 탭 타깃(박지 상세 이동).
  chipMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pin: {
    fontSize: 15,
  },
  chipText: {
    flex: 1,
    fontSize: 15,
    color: Color.textPrimary,
  },
  changeText: {
    fontSize: 14,
    color: Color.textSecondary,
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
  cancelText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 20,
    rowGap: 4,
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
