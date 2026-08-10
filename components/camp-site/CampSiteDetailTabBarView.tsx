import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
} from '@/constants/DesignTokens';
import CampSiteDetailTab from '@/model/camp-site/CampSiteDetailTab';
import { getCampSiteDetailTabLabel } from '@/model/camp-site/CampSiteLabels';

interface Props {
  selectedTab: CampSiteDetailTab;
  onSelectTab: (tab: CampSiteDetailTab) => void;
}

// 3개라 가로 스크롤 없이 한 행에 들어간다(CS-3).
const TABS: CampSiteDetailTab[] = [
  CampSiteDetailTab.Overview,
  CampSiteDetailTab.Weather,
  CampSiteDetailTab.Review,
];

// 세그먼트 높이(목업 §10). HIG 44는 세로 여유로만 채운다: (44 − 38) / 2 = 3.
const SEGMENT_HEIGHT = 38;
const SEGMENT_HIT_SLOP = { top: 3, bottom: 3, left: 0, right: 0 };

/**
 * 상세 시트의 탭 바(CS-3) — 폭을 3등분한 세그먼트이고 활성 탭만 잉크 알약으로 채운다.
 * 밑줄 인디케이터를 쓰지 않는 이유는 이 시스템에 각진 선이 없기 때문이다(면으로 말한다).
 */
const CampSiteDetailTabBarView: FC<Props> = ({ selectedTab, onSelectTab }) => {
  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const selected = tab === selectedTab;

        const handlePress = () => {
          onSelectTab(tab);
        };

        return (
          <TouchableOpacity
            key={tab}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={handlePress}
            activeOpacity={LiquidMotion.pressOpacity}
            hitSlop={SEGMENT_HIT_SLOP}
            accessibilityRole='tab'
            accessibilityState={{ selected }}
            accessibilityLabel={getCampSiteDetailTabLabel(tab)}
          >
            <PretendardText
              style={selected ? styles.selectedLabel : styles.label}
              weight={selected ? 'semibold' : 'medium'}
            >
              {getCampSiteDetailTabLabel(tab)}
            </PretendardText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 18,
    paddingBottom: 4,
    // sticky로 시트 상단에 붙는 행이라 **불투명**해야 한다 — 투명하면 뒤 콘텐츠가 탭 라벨과
    // 겹쳐 읽힌다. 시트 지면색이라 붙어 있는 동안에도 별도 면으로 보이지 않는다.
    backgroundColor: Liquid.canvas,
  },
  // 고정 높이 대신 최소 높이로 Dynamic Type에 대응한다.
  segment: {
    flex: 1,
    minHeight: SEGMENT_HEIGHT,
    borderRadius: LiquidRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentSelected: {
    backgroundColor: Liquid.ink,
  },
  label: {
    fontSize: 13.5,
    color: Liquid.inkTertiary,
  },
  selectedLabel: {
    fontSize: 13.5,
    color: Liquid.surface,
  },
});

export default CampSiteDetailTabBarView;
