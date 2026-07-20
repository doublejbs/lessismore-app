import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { setBagDestinationPicker } from '@/model/bag-destination/BagDestinationPickerHandoff';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';

interface Props {
  bagDetail: BagDetail;
  emphasized?: boolean;
}

// 배낭 상세의 여행지 타일(DST-2/BD-10). 위치명이 주 정보고 날씨는 보조 정보다.
// 미설정이면 중간 날씨 화면을 거치지 않고 공용 선택기를 바로 연다.
const BagDetailDestinationView: FC<Props> = ({ bagDetail, emphasized = false }) => {
  const router = useRouter();
  const bagWeather = bagDetail.getBagWeather();
  const location = bagWeather.getLocation();

  // 저장 성공 시 BagWeather가 갱신돼 이 타일도 곧바로 새 여행지·날씨를 반영한다.
  // 실패는 선택기가 알리고 열린 채 유지하도록 그대로 던진다(DST-6).
  const handleConfirmLocation = async (next: BagLocation) => {
    await bagWeather.updateLocation(next);
  };

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('bag_weather');

    if (!location) {
      // 공용 선택기(DST-3)는 라우트라 저장 콜백을 모듈 레벨 핸드오프로 넘기고 push한다.
      setBagDestinationPicker({
        currentLocation: null,
        onConfirm: handleConfirmLocation,
      });

      router.push('/bag-destination-picker');

      return;
    }

    router.push(`/bag/${bagDetail.getId()}/weather`);
  };

  // 여행 기간에 해당하는 일자만으로 요약(스냅샷이 옛 더 넓은 기간을 담고 있어도 기간으로 제한).
  const tripDaily = bagWeather.getDailyInRange();
  const summary = tripDaily.length > 0 ? summarizeWeatherPeriod(tripDaily) : null;
  const fg = emphasized ? Color.background : Color.textPrimary;
  const subFg = emphasized ? Color.iconMuted : Color.textSecondary;
  // 날씨가 있으면 대표 상태 아이콘을, 없으면 여행지 자체를 나타내는 아이콘을 쓴다.
  const iconName = summary ? summary.icon : location ? 'location-outline' : 'map-outline';
  // 등록된 박지 연결은 색이 아니라 📍로 구분한다(DST-2).
  const title = location
    ? `${location.campSpotId ? '📍 ' : ''}${location.name}`
    : '여행지';
  const subtitle = location
    ? summary
      ? `${summary.cond} · ${summary.low}~${summary.high}°`
      : bagWeather.hasError()
        ? '날씨를 불러오지 못했어요'
        : null
    : '여행지 선택';

  // 강조 타일은 전체 폭 가로 카드 — 아이콘 좌측, 여행지·날씨 우측.
  if (emphasized) {
    return (
      <TouchableOpacity
        style={[styles.tile, styles.tileEmphasized, styles.tileFull]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={location ? `여행지 ${location.name}` : '여행지 선택'}
      >
        <View style={styles.emphRow}>
          <Ionicons name={iconName} size={26} color={fg} />
          <View style={styles.emphMain}>
            <PretendardText
              style={[styles.title, { color: fg }]}
              weight='semibold'
              numberOfLines={1}
            >
              {title}
            </PretendardText>
            {subtitle && (
              <PretendardText
                style={[styles.subtitle, { color: subFg }]}
                numberOfLines={1}
              >
                {subtitle}
              </PretendardText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={location ? `여행지 ${location.name}` : '여행지 선택'}
    >
      <Ionicons name={iconName} size={24} color={fg} />
      <View style={styles.textWrap}>
        <PretendardText
          style={[styles.title, { color: fg }]}
          weight='semibold'
          numberOfLines={1}
        >
          {title}
        </PretendardText>
        {subtitle && (
          <PretendardText
            style={[styles.subtitle, { color: subFg }]}
            numberOfLines={1}
          >
            {subtitle}
          </PretendardText>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    minHeight: 92,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileEmphasized: {
    backgroundColor: Color.chipActiveBg,
  },
  // 강조 타일은 전체 폭 가로 카드 — 세로 공간은 줄이고 좌우로 편다.
  tileFull: {
    width: '100%',
    minHeight: 68,
    justifyContent: 'center',
  },
  emphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emphMain: {
    flex: 1,
    gap: 2,
  },
  textWrap: {
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 12,
  },
});

export default observer(BagDetailDestinationView);
