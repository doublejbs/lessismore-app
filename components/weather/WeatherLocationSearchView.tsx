import { FC, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import WeatherMapPickerView from './WeatherMapPickerView';

interface Props {
  bagWeather: BagWeather;
  onDone?: () => void;
}

// WT-2: 여행지 위치 설정 진입. 위치가 없으면 `여행지 설정` 버튼, 있으면 위치 칩 + `변경`.
// 설정·변경은 항상 풀스크린 지도 피커(WT-3)를 연다 — 검색·현재위치·핀·박지 선택은 모두 지도 안에서 처리한다.
const WeatherLocationSearchView: FC<Props> = ({ bagWeather, onDone }) => {
  const router = useRouter();
  const [mapVisible, setMapVisible] = useState(false);

  const location = bagWeather.getLocation();
  const isSpotLinked = !!location?.spotId;

  const handleOpenMap = () => {
    setMapVisible(true);
  };

  const handleCloseMap = () => {
    setMapVisible(false);
  };

  // 박지 링크(spotId)가 있으면 위치 칩 탭 시 박지 상세로 이동한다(배낭↔박지 상호 이동, WT-2).
  const handleGoToSpot = () => {
    const spotId = location?.spotId;

    if (spotId) {
      router.push(`/camp-site/${spotId}`);
    }
  };

  return (
    <View style={styles.container}>
      {location ? (
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
          <TouchableOpacity onPress={handleOpenMap} hitSlop={8}>
            <PretendardText style={styles.changeText} weight='medium'>
              변경
            </PretendardText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.setButton}
          onPress={handleOpenMap}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='여행지 설정'
        >
          <Ionicons name='map-outline' size={18} color={Color.background} />
          <PretendardText style={styles.setButtonText} weight='semibold'>
            여행지 설정
          </PretendardText>
        </TouchableOpacity>
      )}

      <WeatherMapPickerView
        bagWeather={bagWeather}
        visible={mapVisible}
        onClose={handleCloseMap}
        onDone={onDone}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
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
  setButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.input,
    height: 48,
  },
  setButtonText: {
    fontSize: 15,
    color: Color.background,
  },
});

export default observer(WeatherLocationSearchView);
