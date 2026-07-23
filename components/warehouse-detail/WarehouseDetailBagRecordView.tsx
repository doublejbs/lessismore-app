import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Gear from '../../model/gear/Gear';
import WarehouseDetail, {
  GearTripRecord,
} from '../../model/warehouse-detail/WarehouseDetail';
import GearUsageStatus from '../../model/warehouse-detail/GearUsageStatus';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import SeperaterView from '../ui/SeperaterView';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';

interface Props {
  gear: Gear;
  warehouseDetail: WarehouseDetail;
}

// 함께한 여행 타임라인(GD-10) — 배낭별 행을 여행 카드로 강화한 GD-2 확장.
// 이름·기간·여행지·날씨 요약·챙김 여부·사용 3-상태를 보여주고, 탭 시 배낭 상세로 이동한다.
// 상단 통계 카드는 사용 지표 히어로(GD-9)로 통합되어 여기서는 표시하지 않는다.
const WarehouseDetailBagRecordView: FC<Props> = ({ gear, warehouseDetail }) => {
  const bagCount = gear.getBagCount();

  if (bagCount === 0) {
    return null;
  }

  const renderStatusTag = (status: GearUsageStatus) => {
    if (status === GearUsageStatus.Useless) {
      return (
        <View style={styles.uselessTag}>
          <PretendardText style={styles.uselessTagText}>안 씀</PretendardText>
        </View>
      );
    } else if (status === GearUsageStatus.Used) {
      return (
        <View style={styles.usedTag}>
          <PretendardText style={styles.usedTagText}>사용</PretendardText>
        </View>
      );
    } else {
      // 미기록 — 기존 "사용 여부 입력" 유도를 유지한다(GD-10).
      return (
        <PretendardText style={styles.placeholderText}>
          사용 여부를 입력해주세요
        </PretendardText>
      );
    }
  };

  const renderTripCard = (record: GearTripRecord) => {
    const { bag, status } = record;
    const displayDate = bag.getDisplayDate();
    const locationName = bag.getLocationName();
    const metaParts = [displayDate, locationName].filter(
      (part): part is string => part !== null
    );
    const weatherSummary = summarizeWeatherPeriod(
      bag.getWeather()?.daily ?? []
    );
    // 강수(비/눈)가 있을 때만 아이콘을 붙인다 — 기온 범위는 항상 표시(GD-10).
    const showWeatherIcon = weatherSummary !== null && weatherSummary.hasPrecip;

    const handlePress = () => {
      warehouseDetail.goToBag(bag);
    };

    return (
      <TouchableOpacity
        key={bag.getID()}
        style={styles.tripCard}
        onPress={handlePress}
        // 커스텀 라벨을 두면 자식 텍스트(기간·여행지·날씨·상태)가 스크린리더에서
        // 전부 가려지므로, 라벨 없이 자식 평탄화에 맡긴다(HIG 접근성).
        accessibilityRole='button'
      >
        <View style={styles.tripContent}>
          <View style={styles.tripHeaderRow}>
            <PretendardText
              weight='semibold'
              numberOfLines={1}
              style={styles.tripName}
            >
              {bag.getName()}
            </PretendardText>
            {renderStatusTag(status)}
          </View>
          {metaParts.length > 0 && (
            <PretendardText style={styles.tripMetaText}>
              {metaParts.join(' · ')}
            </PretendardText>
          )}
          {weatherSummary && (
            <View style={styles.weatherRow}>
              {showWeatherIcon && (
                <Ionicons
                  name={weatherSummary.icon}
                  size={13}
                  color={Color.textSecondary}
                />
              )}
              <PretendardText style={styles.tripMetaText}>
                {`${weatherSummary.low}° ~ ${weatherSummary.high}°`}
              </PretendardText>
            </View>
          )}
        </View>
        <Ionicons name='chevron-forward' size={24} color={Color.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <SeperaterView />
      <View style={styles.container}>
        <PretendardText weight='bold' style={styles.headerText}>
          함께한 여행 {bagCount}회
        </PretendardText>
        <View style={styles.listContainer}>
          {warehouseDetail.getTripRecords().map(renderTripCard)}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  headerText: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  listContainer: {
    flexDirection: 'column',
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.card,
    marginTop: 12,
  },
  tripContent: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tripName: {
    flex: 1,
    fontSize: 15,
    color: Color.textPrimary,
  },
  tripMetaText: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usedTag: {
    backgroundColor: Color.textTertiary,
    borderRadius: Radius.card,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  usedTagText: {
    fontSize: 11,
    color: Color.background,
  },
  uselessTag: {
    backgroundColor: Color.background,
    borderRadius: Radius.card,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  uselessTagText: {
    fontSize: 11,
    color: Color.textTertiary,
  },
  placeholderText: {
    color: Color.textSecondary,
    fontSize: 11,
  },
});

export default observer(WarehouseDetailBagRecordView);
