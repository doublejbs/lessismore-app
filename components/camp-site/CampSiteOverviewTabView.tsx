import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidChip from '@/components/liquid/LiquidChip';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidSemantic,
} from '@/constants/DesignTokens';
import CampSiteType from '@/model/camp-site/CampSiteType';
import CampSiteFacility from '@/model/camp-site/CampSiteFacility';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  WILD_NOTICE,
  getCampSiteSourceLabel,
  getCampSiteTagLabel,
} from '@/model/camp-site/CampSiteLabels';

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
      {/* 지형·특징 태그(CS-3) — 누를 수 없는 표시용 칩이라 onPress를 주지 않는다. */}
      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.map(tag => (
            <LiquidChip
              key={tag}
              label={`#${getCampSiteTagLabel(tag)}`}
              size='sm'
            />
          ))}
        </View>
      ) : null}

      {hasWarnings ? (
        <View style={styles.warningBox}>
          <Ionicons name='warning' size={18} color={LiquidSemantic.warnInk} />
          <PretendardText style={styles.warningText}>
            {spot.warnings}
          </PretendardText>
        </View>
      ) : null}
      {/* 유형 전체에 붙는 일반 안내라 박지별 경고 박스보다 약하게 — 면 없이 아이콘 + 한 줄(CS-4). */}
      {hasWildNotice ? (
        <View style={styles.wildNoticeRow}>
          <Ionicons
            name='warning-outline'
            size={14}
            color={LiquidSemantic.warnInk}
            style={styles.wildNoticeIcon}
          />
          <PretendardText style={styles.wildNoticeText}>
            {WILD_NOTICE}
          </PretendardText>
        </View>
      ) : null}

      {facilities.length > 0 ? (
        <LiquidCard radius='tile'>
          <LiquidSectionLabel>시설</LiquidSectionLabel>
          <View style={styles.facilityRow}>
            {facilities.map(facility => {
              const meta = FACILITY_META[facility];

              return (
                <View key={facility} style={styles.facilityItem}>
                  <Ionicons
                    name={meta.icon}
                    size={17}
                    color={Liquid.inkSecondary}
                  />
                  <PretendardText style={styles.facilityLabel}>
                    {meta.label}
                  </PretendardText>
                </View>
              );
            })}
          </View>
        </LiquidCard>
      ) : null}

      {spot.accessInfo ? (
        <LiquidCard radius='tile'>
          <LiquidSectionLabel>접근 정보</LiquidSectionLabel>
          <PretendardText style={styles.accessInfo}>
            {spot.accessInfo}
          </PretendardText>
        </LiquidCard>
      ) : null}

      <PretendardText style={styles.source}>
        출처 · {getCampSiteSourceLabel(spot.source)}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // 의미색(warn)은 액센트 체계 밖이라 리디자인해도 값이 바뀌지 않는다 — 면·모서리만 옮긴다
  // (창고 장비 상세의 덜어내기 배너와 같은 문법).
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: LiquidSemantic.warnBg,
    borderRadius: LiquidRadius.tile,
    paddingVertical: 14,
    paddingHorizontal: LiquidLayout.cardPad,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: LiquidSemantic.warnInkStrong,
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
    color: LiquidSemantic.warnInkStrong,
  },
  facilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 10,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  facilityLabel: {
    fontSize: 13.5,
    color: Liquid.ink,
  },
  accessInfo: {
    fontSize: 13.5,
    lineHeight: 21,
    color: Liquid.inkSecondary,
  },
  source: {
    marginTop: 4,
    fontSize: 12.5,
    color: Liquid.inkMuted,
  },
});

export default CampSiteOverviewTabView;
