import { ComponentProps, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import CampSiteFacility from '@/model/camp-site/CampSiteFacility';
import { getCampSiteTypeLabel } from '@/model/camp-site/CampSiteLabels';
import {
  openCampSpotInNaverMap,
  shareCampSpot,
} from '@/model/camp-site/CampSiteActions';
import { takeCampSiteSummary } from '@/model/camp-site/CampSiteSummaryHandoff';
import app from '@/model/app/App';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// 시설 → 아이콘 + 라벨 매핑 (요약 시트 시설 요약).
const FACILITY_META: Record<
  CampSiteFacility,
  { icon: IoniconName; label: string }
> = {
  [CampSiteFacility.Toilet]: { icon: 'male-female', label: '화장실' },
  [CampSiteFacility.Water]: { icon: 'water-outline', label: '식수' },
  [CampSiteFacility.Deck]: { icon: 'grid-outline', label: '데크' },
  [CampSiteFacility.Store]: { icon: 'storefront-outline', label: '매점' },
};

// CS-2: 마커 탭 시 뜨는 박지 요약 바텀 시트(네이티브 formSheet).
// 시트가 탭바 위를 덮어 가리고, undimmed detent라 뒤 지도는 계속 조작할 수 있다.
// 상단에 박지 상세와 동일한 액션(공유·네이버 지도)과 닫기를 둔다.
const CampSiteSummaryScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // 핸드오프는 마운트 시 1회 소비하고 상태로 들고 있는다 —
  // 상세로 이동했다 돌아와도(시트가 스택에 남아 있음) 내용이 유지된다.
  const [params] = useState(() => takeCampSiteSummary());

  // 시트가 닫히면(스와이프·닫기) 지도의 마커 선택을 해제한다.
  useEffect(() => {
    return () => {
      params?.onClose();
    };
  }, [params]);

  if (!params) {
    return null;
  }

  const { spot, onMoveToSpot } = params;

  const handleClose = () => {
    router.back();
  };

  const handlePressDetail = () => {
    app.getAnalyticsManager()?.logClick('camp_site_summary_detail');
    router.push(`/camp-site/${spot.id}`);
  };

  const handlePressShare = () => {
    void shareCampSpot(spot);
  };

  const handlePressNaverMap = () => {
    void openCampSpotInNaverMap(spot);
  };

  // 시트는 열어 둔 채 지도 카메라만 그 박지로 되돌린다(뒤 지도가 조작 가능한 undimmed 시트).
  const handlePressMoveToSpot = () => {
    onMoveToSpot(spot);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.headerRow}>
        <PretendardText style={styles.name} weight='bold' numberOfLines={1}>
          {spot.name}
        </PretendardText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handlePressShare}
            hitSlop={6}
            accessibilityRole='button'
            accessibilityLabel='공유'
          >
            <Ionicons name='share-outline' size={22} color={Color.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handlePressNaverMap}
            hitSlop={6}
            accessibilityRole='button'
            accessibilityLabel='네이버 지도에서 열기'
          >
            <Ionicons name='map-outline' size={22} color={Color.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClose}
            hitSlop={6}
            accessibilityRole='button'
            accessibilityLabel='닫기'
          >
            <Ionicons name='close' size={22} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <PretendardText style={styles.badgeText} weight='medium'>
            {getCampSiteTypeLabel(spot.type)}
          </PretendardText>
        </View>
        <Ionicons
          name='location-outline'
          size={14}
          color={Color.textSecondary}
        />
        <PretendardText style={styles.region} numberOfLines={1}>
          {spot.region}
        </PretendardText>
      </View>

      {/* 설명 — 시트에선 3줄까지. 전문은 상세(CS-3)에서 본다. */}
      {spot.description ? (
        <PretendardText style={styles.description} numberOfLines={3}>
          {spot.description}
        </PretendardText>
      ) : null}

      {spot.facilities.length > 0 && (
        <View style={styles.facilityRow}>
          {spot.facilities.map(facility => {
            const meta = FACILITY_META[facility];

            if (!meta) {
              return null;
            }

            return (
              <View key={facility} style={styles.facilityItem}>
                <Ionicons
                  name={meta.icon}
                  size={14}
                  color={Color.textSecondary}
                />
                <PretendardText style={styles.facilityLabel}>
                  {meta.label}
                </PretendardText>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.moveToSpotButton}
          onPress={handlePressMoveToSpot}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityRole='button'
          accessibilityLabel={`${spot.name} 위치로 지도 이동`}
        >
          <Ionicons name='locate' size={14} color={Color.textSecondary} />
          <PretendardText style={styles.moveToSpotText} weight='medium'>
            위치로 이동
          </PretendardText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailButton}
          onPress={handlePressDetail}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={`${spot.name} 상세 보기`}
        >
          <PretendardText style={styles.detailButtonText} weight='semibold'>
            자세히 보기
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 18,
    color: Color.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  badgeText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  region: {
    flex: 1,
    fontSize: 13,
    color: Color.textSecondary,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: Color.textTertiary,
  },
  facilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  facilityLabel: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  moveToSpotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  moveToSpotText: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  detailButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailButtonText: {
    fontSize: 15,
    color: Color.background,
  },
});

export default CampSiteSummaryScreen;
