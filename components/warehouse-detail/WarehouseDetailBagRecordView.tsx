import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Gear from '../../model/gear/Gear';
import WarehouseDetail, {
  GearTripRecord,
} from '../../model/warehouse-detail/WarehouseDetail';
import GearUsageStatus from '../../model/warehouse-detail/GearUsageStatus';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Acg, AcgFontSize, AcgRadius, AcgRow } from '@/constants/DesignTokens';
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
        <View style={[styles.statusTag, styles.uselessTag]}>
          <PretendardText style={[styles.statusTagText, styles.uselessTagText]}>
            사용 안함
          </PretendardText>
        </View>
      );
    } else if (status === GearUsageStatus.Used) {
      return (
        <View style={[styles.statusTag, styles.usedTag]}>
          <PretendardText style={[styles.statusTagText, styles.usedTagText]}>
            사용
          </PretendardText>
        </View>
      );
    } else {
      // 미기록 — `사용`·`사용 안함`과 같은 시각 문법의 태그로 둔다(GD-10).
      // 태그 자리에 문장("사용 여부를 입력해주세요")을 넣으면 보조 문구가 배낭 이름보다
      // 넓은 자리를 차지해 이름이 말줄임된다. 입력 유도는 우측 꺾쇠(›)와 탭 동작이 맡는다.
      return (
        <View style={[styles.statusTag, styles.unrecordedTag]}>
          <PretendardText
            style={[styles.statusTagText, styles.unrecordedTagText]}
          >
            미기록
          </PretendardText>
        </View>
      );
    }
  };

  const renderTripCard = (record: GearTripRecord, index: number) => {
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
        style={[styles.tripCard, index > 0 && styles.tripCardDivided]}
        onPress={handlePress}
        // 커스텀 라벨을 두면 자식 텍스트(기간·여행지·날씨·상태)가 스크린리더에서
        // 전부 가려지므로, 라벨 없이 자식 평탄화에 맡긴다(HIG 접근성).
        // 상태는 태그 텍스트(`사용`·`사용 안함`·`미기록`)로 라벨에 그대로 들어간다.
        accessibilityRole='button'
        // 미기록 행에서만 입력 유도를 힌트로 남긴다 — 태그를 한 단어로 줄이면서(GD-10)
        // 문장이 하던 안내를 시각 대신 접근성 레이어가 맡는다.
        accessibilityHint={
          status === GearUsageStatus.Unrecorded
            ? '사용 여부를 입력할 수 있어요'
            : undefined
        }
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
            // 1줄 말줄임 — `location.name`에 짧은 지명 대신 전체 주소가 저장된 배낭이 있어
            // 그대로 흘리면 메타가 2줄이 되면서 행 높이가 제각각이 되고, 주 정보인 배낭 이름보다
            // 보조 정보가 길어져 위계가 뒤집힌다(GD-10). 날씨는 별도 줄이라 영향을 받지 않는다.
            <PretendardText style={styles.tripMetaText} numberOfLines={1}>
              {metaParts.join(' · ')}
            </PretendardText>
          )}
          {weatherSummary && (
            <View style={styles.weatherRow}>
              {showWeatherIcon && (
                <Ionicons
                  name={weatherSummary.icon}
                  size={13}
                  color={Acg.textMuted}
                />
              )}
              <PretendardText style={styles.tripMetaText}>
                {`${weatherSummary.low}° ~ ${weatherSummary.high}°`}
              </PretendardText>
            </View>
          )}
        </View>
        <Ionicons name='chevron-forward' size={13} color={Acg.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <WarehouseDetailSectionView
      title={`함께한 여행 ${bagCount}회`}
      variant='list'
    >
      {warehouseDetail.getTripRecords().map(renderTripCard)}
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  // 목록 행 문법(HM-8) — 면 없이 놓고 위 행과는 헤어라인으로 가른다.
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  tripCardDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
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
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 22,
    color: Acg.ink,
  },
  tripMetaText: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // 세 상태 태그의 공통 형태 — 색만 다르고 크기·모서리는 같다. 테두리는 세 태그의 높이를
  // 맞추려고 공통으로 두고, 아웃라인이 아닌 태그는 배경과 같은 색을 줘 보이지 않게 한다(GD-10).
  // 칩과 같은 모서리 — 세 상태가 나란히 놓이므로 형태는 하나다.
  statusTag: {
    borderWidth: 1,
    borderRadius: AcgRadius.chip,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusTagText: {
    fontSize: AcgFontSize.meta,
  },
  // `사용`은 끝난 기록이라 한 단계 낮춘 회색 채움으로 둔다 — 가장 강한 검정 채움은
  // 사용자가 눌러주길 바라는 `미기록`에 넘긴다(GD-10).
  usedTag: {
    backgroundColor: Acg.hairline,
    borderColor: Acg.hairline,
  },
  usedTagText: {
    color: Acg.textMuted,
  },
  // `사용 안함`도 끝난 기록 — 셋 중 가장 조용한 아웃라인. 카드 배경(inputBg) 위에서 흰 칩이
  // 사라지지 않도록 테두리를 보이게 둔다(GD-10).
  uselessTag: {
    backgroundColor: Acg.paper,
    borderColor: Acg.hairline,
  },
  uselessTagText: {
    color: Acg.textMuted,
  },
  // 미기록 태그 — 사용자가 눌러주길 바라는 유일한 상태라 셋 중 가장 도드라지게 검정 채움을
  // 준다. 저대비 회색은 완료 상태보다 약해 위계가 정반대였다(GD-10).
  unrecordedTag: {
    backgroundColor: Acg.ink,
    borderColor: Acg.ink,
  },
  unrecordedTagText: {
    color: Acg.paper,
  },
});

export default observer(WarehouseDetailBagRecordView);
