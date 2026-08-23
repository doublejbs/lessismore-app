import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType, Spacing } from '@/constants/DesignTokens';
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

// 상세 시트 고정 영역의 탭 바(CS-3) — 선택 탭은 라벨을 진하게 + 하단 인디케이터(구글 지도 톤).
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
            style={styles.tab}
            onPress={handlePress}
            activeOpacity={0.7}
            accessibilityRole='tab'
            accessibilityState={{ selected }}
            accessibilityLabel={getCampSiteDetailTabLabel(tab)}
          >
            <PretendardText
              style={selected ? styles.selectedLabel : styles.label}
              weight={selected ? 'bold' : 'medium'}
            >
              {getCampSiteDetailTabLabel(tab)}
            </PretendardText>
            <View
              style={[styles.indicator, selected && styles.selectedIndicator]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: AcgLayout.screenPadding,
    // 위로 스크롤해 이 탭 바가 시트 상단에 고정될 때 그래버 핸들과 붙지 않도록 상단 여백을 준다(CS-3).
    paddingTop: Spacing.item,
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
    // 스티키 헤더라 **불투명**이어야 한다(2026-08-13 사용자 지적) — transparent면 위로
    // 스크롤한 콘텐츠가 탭 바 뒤로 비친다. 지면이 순백이라 순백 채움은 떠 보이지 않는다.
    backgroundColor: Acg.paper,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 6,
  },
  // 레퍼런스의 텍스트 탭(You/Community/Following)과 같은 문법 — 비선택은 회색, 선택은 잉크 +
  // 밑줄. 크기는 컨트롤 단이다.
  label: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  selectedLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  // 비선택 탭도 같은 높이를 차지해야(색만 없음) 라벨 baseline이 어긋나지 않는다.
  indicator: {
    marginTop: 8,
    height: 2,
    width: '100%',
  },
  selectedIndicator: {
    backgroundColor: Acg.ink,
  },
});

export default observer(CampSiteDetailTabBarView);
