import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import CampSiteType from '@/model/camp-site/CampSiteType';
import CampSiteFacility from '@/model/camp-site/CampSiteFacility';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  WILD_NOTICE,
  getCampSiteSourceLabel,
  getCampSiteTagLabel,
} from '@/model/camp-site/CampSiteLabels';

// 주의·규제 경고(CS-4)용 시맨틱 색(주황 계열) — 디자인 토큰에 없는 경고 전용 리터럴.
const WARNING_BG_COLOR = '#FFF4E5';
const WARNING_TEXT_COLOR = '#B65A00';

interface Props {
  spot: CampSpot;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

// 시설 코드 → 아이콘·라벨(있는 것만 표시).
const FACILITY_META: Record<
  CampSiteFacility,
  { icon: IoniconName; label: string }
> = {
  [CampSiteFacility.Toilet]: { icon: 'male-female-outline', label: '화장실' },
  [CampSiteFacility.Water]: { icon: 'water-outline', label: '식수' },
  [CampSiteFacility.Deck]: { icon: 'grid-outline', label: '데크' },
  [CampSiteFacility.Store]: { icon: 'storefront-outline', label: '매점' },
};

const FACILITY_ORDER: CampSiteFacility[] = [
  CampSiteFacility.Toilet,
  CampSiteFacility.Water,
  CampSiteFacility.Deck,
  CampSiteFacility.Store,
];

// 상세 시트 '개요' 탭(CS-3) — 태그·주의 고지(CS-4)·시설·접근 정보·출처.
// 설명·대표 사진은 상단 블록(CampSiteDetailHeaderView)으로 올라가 여기서 제외한다.
// 바깥 스크롤(CampSiteDetailView)이 스크롤을 담당하므로 자체 ScrollView를 두지 않는다.
const CampSiteOverviewTabView: FC<Props> = ({ spot }) => {
  const facilities = FACILITY_ORDER.filter(facility =>
    spot.facilities.includes(facility)
  );
  const hasWildNotice = spot.type === CampSiteType.Wild;
  const hasWarnings = Boolean(spot.warnings);
  const tags = spot.tags ?? [];

  return (
    <View style={styles.body}>
      {/* 지형·특징 태그(CS-3) — 비인터랙티브 칩 */}
      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <PretendardText style={styles.tagChipText} weight='medium'>
                #{getCampSiteTagLabel(tag)}
              </PretendardText>
            </View>
          ))}
        </View>
      ) : null}

      {hasWarnings ? (
        <View style={styles.warningBox}>
          <Ionicons name='warning-outline' size={18} color={WARNING_TEXT_COLOR} />
          <PretendardText style={styles.warningText}>
            {spot.warnings}
          </PretendardText>
        </View>
      ) : null}
      {/* 유형 전체에 붙는 일반 안내라 박지별 경고 박스보다 약하게 — 배경 없이 아이콘 + 한 줄(CS-4). */}
      {hasWildNotice ? (
        <View style={styles.wildNoticeRow}>
          <Ionicons
            name='warning-outline'
            size={14}
            color={WARNING_TEXT_COLOR}
            style={styles.wildNoticeIcon}
          />
          <PretendardText style={styles.wildNoticeText}>
            {WILD_NOTICE}
          </PretendardText>
        </View>
      ) : null}

      {facilities.length > 0 ? (
        <View style={styles.section}>
          <PretendardText style={styles.sectionTitle} weight='semibold'>
            시설
          </PretendardText>
          <View style={styles.facilityRow}>
            {facilities.map(facility => {
              const meta = FACILITY_META[facility];

              return (
                <View key={facility} style={styles.facilityItem}>
                  <Ionicons
                    name={meta.icon}
                    size={18}
                    color={Color.textSecondary}
                  />
                  <PretendardText style={styles.facilityLabel}>
                    {meta.label}
                  </PretendardText>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {spot.accessInfo ? (
        <View style={styles.section}>
          <PretendardText style={styles.sectionTitle} weight='semibold'>
            접근 정보
          </PretendardText>
          <PretendardText style={styles.accessInfo}>
            {spot.accessInfo}
          </PretendardText>
        </View>
      ) : null}

      <PretendardText style={styles.source}>
        출처 · {getCampSiteSourceLabel(spot.source)}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  tagChipText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: WARNING_BG_COLOR,
    borderRadius: Radius.card,
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: WARNING_TEXT_COLOR,
  },
  wildNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  // 첫 줄 텍스트의 시각 중심에 아이콘을 맞춘다(Dynamic Type로 줄 높이가 늘어도 상단 정렬 유지).
  wildNoticeIcon: {
    marginTop: 2,
  },
  wildNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: WARNING_TEXT_COLOR,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  facilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 8,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  facilityLabel: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  accessInfo: {
    fontSize: 14,
    lineHeight: 22,
    color: Color.textPrimary,
  },
  source: {
    marginTop: 8,
    fontSize: 12,
    color: Color.textSecondary,
  },
});

export default CampSiteOverviewTabView;
