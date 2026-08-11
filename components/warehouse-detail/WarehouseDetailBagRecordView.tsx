import { FC } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Gear from '../../model/gear/Gear';
import WarehouseDetail, {
  GearTripRecord,
} from '../../model/warehouse-detail/WarehouseDetail';
import GearUsageStatus from '../../model/warehouse-detail/GearUsageStatus';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import { shortenLocationName } from '@/model/warehouse-detail/TripLocationName';

interface Props {
  gear: Gear;
  warehouseDetail: WarehouseDetail;
}

// 상태 태그 지오메트리 — 셋 다 크기·모서리가 같고 면과 글자색만 갈린다.
const TAG_HEIGHT = 22;

/**
 * 3-상태 태그의 면·글자색·라벨(GD-10). 형태는 `statusTag`·`statusTagText`가 공통으로 들고
 * 여기서 갈리는 것만 표로 둔다 — 세 갈래 분기가 같은 JSX를 세 번 쓰던 자리다
 * (`LiquidPillButton`의 `VARIANT_STYLES`와 같은 문법).
 *
 * 위계는 **끝난 기록은 조용히, 눌러주길 바라는 상태는 도드라지게**다:
 * - `사용` — 끝난 기록이라 중립 배지 면.
 * - `사용 안함` — 같은 끝난 기록 중 가장 조용한 아웃라인. 흰 카드 위라 면 대신 테두리로만 산다.
 * - `미기록` — 사용자가 눌러주길 바라는 유일한 상태라 가장 강한 잉크 채움. 저대비 회색은
 *   완료 상태보다 약해 위계가 정반대였다.
 */
const STATUS_TAGS: Record<
  GearUsageStatus,
  { surface: ViewStyle; label: TextStyle; text: string }
> = {
  [GearUsageStatus.Used]: {
    surface: { backgroundColor: Liquid.badgeFill },
    label: { color: Liquid.inkSecondary },
    text: '사용',
  },
  [GearUsageStatus.Useless]: {
    surface: { borderWidth: 0.5, borderColor: Liquid.hairlineStrong },
    label: { color: Liquid.inkTertiary },
    text: '사용 안함',
  },
  [GearUsageStatus.Unrecorded]: {
    surface: { backgroundColor: Liquid.ink },
    label: { color: Liquid.surface },
    text: '미기록',
  },
};

/**
 * 미기록 행의 태그도 `사용`·`사용 안함`과 **같은 시각 문법의 한 단어**다(GD-10).
 * 태그 자리에 문장("사용 여부를 입력해주세요")을 넣으면 보조 문구가 배낭 이름보다 넓은 자리를
 * 차지해 이름이 말줄임된다 — 입력 유도는 우측 쉐브론·탭 동작과 접근성 힌트가 맡는다.
 */
const renderStatusTag = (status: GearUsageStatus) => {
  const { surface, label, text } = STATUS_TAGS[status];

  return (
    <View style={[styles.statusTag, surface]}>
      <PretendardText weight='semibold' style={[styles.statusTagText, label]}>
        {text}
      </PretendardText>
    </View>
  );
};

/**
 * 함께한 여행 타임라인(GD-10) — 배낭별 행을 여행 카드로 강화한 GD-2 확장.
 * 이름·기간·여행지·날씨 요약·사용 3-상태를 보여주고, 탭 시 배낭 상세로 이동한다.
 *
 * Liquid Depth에서는 **흰 카드 하나 안에 행을 쌓고 헤어라인으로만 가른다**(목업 §8 창고 목록과
 * 같은 목록 문법) — 행마다 면을 두면 목록이 카드 더미로 보인다.
 */
const WarehouseDetailBagRecordView: FC<Props> = ({ gear, warehouseDetail }) => {
  const bagCount = gear.getBagCount();

  if (bagCount === 0) {
    return null;
  }

  const renderTripRow = (record: GearTripRecord, index: number) => {
    const { bag, status } = record;
    const displayDate = bag.getDisplayDate();
    // 전체 주소가 저장된 배낭은 시·군·구까지만 남긴다 — 뒤를 말줄임에 맡기면 단어 중간에서
    // 잘려(`경기도 성남시 분당구 미금일로…`) 어디였는지도 알 수 없다(2026-08-11 디자인 리뷰).
    const locationName = bag.getLocationName();
    const metaParts = [
      displayDate,
      locationName === null ? null : shortenLocationName(locationName),
    ].filter((part): part is string => part !== null);
    const weatherSummary = summarizeWeatherPeriod(
      bag.getWeather()?.daily ?? []
    );
    // 강수(비/눈)가 있을 때만 아이콘을 붙인다 — 기온 범위는 항상 표시(GD-10).
    const showWeatherIcon = weatherSummary !== null && weatherSummary.hasPrecip;

    const handlePress = () => {
      warehouseDetail.goToBag(bag);
    };

    return (
      <View key={bag.getID()}>
        {index > 0 ? <View style={styles.divider} /> : null}
        <TouchableOpacity
          style={styles.tripRow}
          onPress={handlePress}
          activeOpacity={LiquidMotion.pressOpacity}
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
              // 1줄 말줄임 — 주소를 시·군·구까지 줄여도(위) 긴 지명은 남으므로 안전망은 유지한다.
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
                    color={Liquid.inkSubtle}
                  />
                )}
                <PretendardText style={styles.tripMetaText}>
                  {`${weatherSummary.low}° ~ ${weatherSummary.high}°`}
                </PretendardText>
              </View>
            )}
          </View>
          <Ionicons name='chevron-forward' size={16} color={Liquid.inkSubtle} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <WarehouseDetailSectionView title={`함께한 여행 ${bagCount}회`}>
      {warehouseDetail.getTripRecords().map(renderTripRow)}
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  // 카드 안쪽 여백(16) 안에서만 그어진다 — 행 글자 선과 같은 폭이라 목록이 한 덩어리로 읽힌다.
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  tripContent: {
    flex: 1,
    minWidth: 0,
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
    color: Liquid.ink,
  },
  tripMetaText: {
    fontSize: 12,
    color: Liquid.inkSubtle,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // 세 상태 태그의 공통 형태 — 완전한 알약이고 면·글자색만 갈린다. 고정 높이 대신 minHeight로
  // 두어 OS 글자 크기를 키워도 잘리지 않는다.
  statusTag: {
    minHeight: TAG_HEIGHT,
    borderRadius: TAG_HEIGHT / 2,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTagText: {
    fontSize: 11,
    lineHeight: 16,
  },
});

export default observer(WarehouseDetailBagRecordView);
