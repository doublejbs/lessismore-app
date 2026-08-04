import { FC, useCallback, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useFocusEffect, useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { setBagDestinationPicker } from '@/model/bag-destination/BagDestinationPickerHandoff';
import PretendardText from '@/components/PretendardText';
import { AcgShadow, Acg, Color, Radius } from '@/constants/DesignTokens';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';

interface Props {
  bagDetail: BagDetail;
  emphasized?: boolean;
}

// 배낭 상세의 여행지 타일(DST-2/BD-10). 위치명이 주 정보고 날씨는 보조 정보다.
// 미설정이면 중간 날씨 화면을 거치지 않고 공용 선택기를 바로 연다.
// 선택기에서 여행지를 저장하면 **여행지 상세로 이어서 보낸다**(DST-2) — 아래 ref 주석 참고.
const BagDetailDestinationView: FC<Props> = ({
  bagDetail,
  emphasized = false,
}) => {
  const router = useRouter();
  const bagWeather = bagDetail.getBagWeather();
  const location = bagWeather.getLocation();

  // 저장 성공 시 BagWeather가 갱신돼 이 타일도 곧바로 새 여행지·날씨를 반영한다.
  // 실패는 선택기가 알리고 열린 채 유지하도록 그대로 던진다(DST-6).
  const handleConfirmLocation = async (next: BagLocation) => {
    await bagWeather.updateLocation(next);
    // 선택기가 닫힌 **뒤에** 이동해야 한다 — 여기서 바로 push하면 선택기의 back()이
    // 방금 띄운 화면을 도로 닫는다. 저장 성공만 기억해 두고 아래 포커스 시점에 옮긴다.
    shouldOpenDestinationRef.current = true;
  };

  /**
   * 선택기에서 여행지를 저장했는지(DST-2). 저장 직후가 아니라 **배낭 상세가 다시 포커스될 때**
   * 여행지 상세로 옮기기 위한 표시다. 방금 정한 여행지의 날씨를 바로 보게 하려는 것으로,
   * 저장하고 배낭 상세에 그대로 머무르면 무엇이 저장됐는지 확인하려 한 번 더 눌러야 했다.
   */
  const shouldOpenDestinationRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!shouldOpenDestinationRef.current) {
        return;
      }

      shouldOpenDestinationRef.current = false;
      router.push(`/bag/${bagDetail.getId()}/weather`);
    }, [router, bagDetail])
  );

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
  const summary =
    tripDaily.length > 0 ? summarizeWeatherPeriod(tripDaily) : null;
  const fg = emphasized ? Color.background : Color.textPrimary;
  const subFg = emphasized ? Color.iconMuted : Color.textSecondary;
  // 날씨가 있으면 대표 상태 아이콘을, 없으면 여행지 자체를 나타내는 아이콘을 쓴다.
  const iconName = summary
    ? summary.icon
    : location
      ? 'location-outline'
      : 'map-outline';
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

  // 강조여도 48% 그리드 세로 카드는 그대로 두고 배경/전경색만 검정으로 바꾼다.
  return (
    <TouchableOpacity
      style={[styles.tile, emphasized && styles.tileEmphasized]}
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
    // 지면 위 타일이라 종이 면을 쓴다 — 회색(surfaceMuted)은 지면과 가까워 타일이
    // 떠 보이지 않았다(2026-08-04 사용자 지적). 강조 타일만 잉크 면이다.
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
    borderRadius: Radius.card,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileEmphasized: {
    backgroundColor: Color.chipActiveBg,
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
