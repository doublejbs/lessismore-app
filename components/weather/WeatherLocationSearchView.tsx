import { FC, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import BagDestinationPickerView from '@/components/bag-destination/BagDestinationPickerView';
import { Color, Radius } from '@/constants/DesignTokens';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import BagWeather from '@/model/bag/BagWeather';

interface Props {
  bagWeather: BagWeather;
  onDone?: () => void;
}

// 여행지 화면의 현재 위치 칩과 변경 진입만 담당한다.
// 검색·현재 위치·지도 선택은 공용 풀스크린 선택기에서 한 흐름으로 제공한다(DST-2/DST-3).
const WeatherLocationSearchView: FC<Props> = ({ bagWeather, onDone }) => {
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);
  const location = bagWeather.getLocation();
  const campSpotId = location?.campSpotId ?? null;

  const handleConfirm = async (next: BagLocation) => {
    await bagWeather.updateLocation(next);
    onDone?.();
  };

  const handlePressLocation = () => {
    if (campSpotId) {
      router.push(`/camp-site/${campSpotId}`);
    }
  };

  const locationLabel = location
    ? `${campSpotId ? '📍 ' : ''}${location.name}`
    : '여행지 선택';

  return (
    <>
      <View style={styles.chip}>
        {campSpotId ? (
          <TouchableOpacity
            style={styles.locationSummary}
            onPress={handlePressLocation}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${locationLabel} 박지 상세 보기`}
          >
            <PretendardText
              style={styles.locationText}
              weight='medium'
              numberOfLines={1}
            >
              {locationLabel}
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={16}
              color={Color.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.locationSummary}>
            <Ionicons
              name={location ? 'location-outline' : 'map-outline'}
              size={18}
              color={Color.textPrimary}
            />
            <PretendardText
              style={styles.locationText}
              weight='medium'
              numberOfLines={1}
            >
              {locationLabel}
            </PretendardText>
          </View>
        )}

        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={location ? '여행지 변경' : '여행지 선택'}
        >
          <PretendardText style={styles.changeText} weight='medium'>
            {location ? '변경' : '선택'}
          </PretendardText>
        </TouchableOpacity>
      </View>

      <BagDestinationPickerView
        currentLocation={location}
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingLeft: 14,
    paddingRight: 4,
    minHeight: 48,
  },
  locationSummary: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: Color.textPrimary,
  },
  changeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  changeText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
});

export default observer(WeatherLocationSearchView);
