import { FC } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Stack, useRouter } from 'expo-router';
import { Dayjs } from 'dayjs';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Color, Radius, Spacing } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import { getPhaseLabel } from '@/model/bag/TripPhaseHelper';
import BagDestinationMapPreviewView from './BagDestinationMapPreviewView';
import BagDestinationInfoView from './BagDestinationInfoView';
import BagTripWeatherView from '@/components/weather/BagTripWeatherView';
import useBagDestinationHubState from './useBagDestinationHubState';

interface Props {
  bagWeather: BagWeather;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const formatDay = (d: Dayjs) => `${d.format('M.D')}(${WEEKDAYS[d.day()]})`;

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다.
const SAFE_AREA_EDGES: readonly Edge[] = IS_IOS
  ? ['left', 'right']
  : ['top', 'left', 'right'];

// 여행지 허브(DST-8). 위→아래: 지도 미리보기 → 여행지 정보 → 여행 기간·상황 라벨 → 기간 날씨.
// 라우트(/bag/{id}/weather)는 딥링크 호환을 위해 유지하되, 화면은 여행지를 주인공으로 재구성했다.
const BagDestinationHubView: FC<Props> = ({ bagWeather }) => {
  const router = useRouter();

  const {
    location,
    linkedSpot,
    isMapSupported,
    handleOpenPicker,
    handleOpenSpotDetail,
    handleOpenDirections,
  } = useBagDestinationHubState({ bagWeather });

  const start = bagWeather.getStartDate();
  const end = bagWeather.getEndDate();
  const periodLabel = start.isSame(end, 'day')
    ? formatDay(start)
    : `${formatDay(start)} ~ ${formatDay(end)}`;
  const phaseLabel = getPhaseLabel(start, end);

  return (
    <SafeAreaView style={styles.container} edges={SAFE_AREA_EDGES}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back·scroll edge effect는 시스템에 위임.
          단순(back + 타이틀) 화면이라 우측 액션은 없다. */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '여행지',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
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
      )}

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
          // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
          contentInsetAdjustmentBehavior='automatic'
          showsVerticalScrollIndicator={false}
        >
          {isMapSupported && (
            <BagDestinationMapPreviewView
              location={location}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    minHeight: 52,
  },
  headerTitle: {
    ...AcgType.rowTitle,
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
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodText: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Color.chipInactiveBg,
  },
  phaseText: {
    ...AcgType.meta,
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
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  selectButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
  },
  selectText: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default observer(BagDestinationHubView);
