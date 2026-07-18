import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Dayjs } from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import { getPhaseLabel } from '@/model/bag/TripPhaseHelper';
import BagDestinationPickerView from './BagDestinationPickerView';
import BagDestinationMapPreviewView from './BagDestinationMapPreviewView';
import BagDestinationInfoView from './BagDestinationInfoView';
import BagTripWeatherView from '@/components/weather/BagTripWeatherView';
import useBagDestinationHubState from './useBagDestinationHubState';

interface Props {
  bagWeather: BagWeather;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const formatDay = (d: Dayjs) => `${d.format('M.D')}(${WEEKDAYS[d.day()]})`;

// 여행지 허브(DST-8). 위→아래: 지도 미리보기 → 여행지 정보 → 여행 기간·상황 라벨 → 기간 날씨.
// 라우트(/bag/{id}/weather)는 딥링크 호환을 위해 유지하되, 화면은 여행지를 주인공으로 재구성했다.
const BagDestinationHubView: FC<Props> = ({ bagWeather }) => {
  const router = useRouter();

  const {
    location,
    linkedSpot,
    pickerVisible,
    isMapSupported,
    handleOpenPicker,
    handleClosePicker,
    handleConfirmLocation,
    handleOpenSpotDetail,
    handleOpenDirections,
  } = useBagDestinationHubState({ bagWeather });

  const start = bagWeather.getStartDate();
  const end = bagWeather.getEndDate();
  const periodLabel = start.isSame(end, 'day')
    ? formatDay(start)
    : `${formatDay(start)} ~ ${formatDay(end)}`;
  const phaseLabel = getPhaseLabel(start, end);

  const picker = (
    <BagDestinationPickerView
      currentLocation={location}
      visible={pickerVisible}
      onClose={handleClosePicker}
      onConfirm={handleConfirmLocation}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel='뒤로가기'
        >
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
        <PretendardText style={styles.headerTitle} weight='bold'>
          여행지
        </PretendardText>
        <View style={styles.headerSpacer} />
      </View>

      {!location ? (
        <View style={styles.emptyState}>
          <Ionicons name='map-outline' size={40} color={Color.iconMuted} />
          <PretendardText style={styles.emptyText}>
            여행지를 설정하면{'\n'}그때의 날씨까지 볼 수 있어요
          </PretendardText>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={handleOpenPicker}
            accessibilityRole='button'
            accessibilityLabel='여행지 선택'
          >
            <PretendardText style={styles.selectText} weight='semibold'>
              여행지 선택
            </PretendardText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isMapSupported && (
            <BagDestinationMapPreviewView
              location={location}
              linkedSpot={linkedSpot}
              onPress={handleOpenPicker}
            />
          )}

          <BagDestinationInfoView
            location={location}
            linkedSpot={linkedSpot}
            onOpenSpotDetail={handleOpenSpotDetail}
            onOpenPicker={handleOpenPicker}
            onOpenDirections={handleOpenDirections}
          />

          <View style={styles.divider} />

          <View style={styles.periodSection}>
            <PretendardText style={styles.periodTitle} weight='bold'>
              여행 기간
            </PretendardText>
            <View style={styles.periodRow}>
              <PretendardText style={styles.periodText} weight='medium'>
                {periodLabel}
              </PretendardText>
              <View style={styles.phaseBadge}>
                <PretendardText style={styles.phaseText} weight='medium'>
                  {phaseLabel}
                </PretendardText>
              </View>
            </View>
          </View>

          <BagTripWeatherView bagWeather={bagWeather} />
        </ScrollView>
      )}

      {picker}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    height: 52,
  },
  headerTitle: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  headerSpacer: {
    width: 44,
  },
  headerButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 40,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
    marginVertical: 20,
  },
  periodSection: {
    marginBottom: 20,
    gap: 8,
  },
  periodTitle: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Color.chipInactiveBg,
  },
  phaseText: {
    fontSize: 12,
    color: Color.textPrimary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: Spacing.screenH,
  },
  emptyText: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
  },
  selectText: {
    fontSize: 15,
    color: Color.background,
  },
});

export default observer(BagDestinationHubView);
