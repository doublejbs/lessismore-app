import { FC, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '@/components/Layout';
import InfoSubScreenHeaderView, {
  IOS_EDGES,
  IS_IOS,
  NATIVE_HEADER_HEIGHT,
} from '@/components/info/InfoSubScreenHeaderView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize, Color, Radius } from '@/constants/DesignTokens';
import {
  PRIVACY_POLICY_TEXT,
  TERMS_OF_SERVICE_TEXT,
} from '@/constants/LegalTexts';
import PolicyTab from '@/components/info/PolicyTab';

interface Props {
  // 진입 시 펼쳐 둘 문서(AU-4). 정보 탭의 어느 행을 눌렀는지에 따라 갈린다.
  initialTab: PolicyTab;
}

const TAB_LABELS: Record<PolicyTab, string> = {
  [PolicyTab.Privacy]: '개인정보 처리방침',
  [PolicyTab.Terms]: '이용약관',
};

const TAB_ORDER: readonly PolicyTab[] = [PolicyTab.Privacy, PolicyTab.Terms];

const TAB_TEXTS: Record<PolicyTab, string> = {
  [PolicyTab.Privacy]: PRIVACY_POLICY_TEXT,
  [PolicyTab.Terms]: TERMS_OF_SERVICE_TEXT,
};

/**
 * AU-4: 개인정보 처리방침 · 이용약관 전용 화면.
 *
 * 예전에는 처리방침 전문을 정보 탭 안에서 인라인 아코디언으로 펼쳤다. 8개 조항이라 스크롤이
 * 수천 pt로 늘어나고 접으려면 다시 맨 위로 올라와야 했다. 전문은 이 화면이 맡고,
 * 정보 탭에는 진입 행만 남긴다.
 *
 * 두 문서를 한 화면에서 탭으로 가르는 이유: 성격이 같은 법무 문서라 화면을 둘로 나누면
 * 정보 탭 목록만 길어진다. 어느 행으로 들어왔는지는 `initialTab`이 결정한다.
 */
const InfoPolicyView: FC<Props> = ({ initialTab }) => {
  const [selectedTab, setSelectedTab] = useState<PolicyTab>(initialTab);
  const insets = useSafeAreaInsets();

  return (
    <Layout edges={IS_IOS ? IOS_EDGES : undefined}>
      <InfoSubScreenHeaderView title='약관 및 정책' />

      <View
        style={[
          styles.tabRow,
          // iOS는 투명 네이티브 헤더가 상단을 덮으므로 그만큼 내려서 시작한다(LG-1).
          IS_IOS && { marginTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
      >
        {TAB_ORDER.map(tab => {
          const selected = tab === selectedTab;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.7}
              accessibilityRole='tab'
              accessibilityState={{ selected }}
            >
              <PretendardText
                style={[styles.tabText, selected && styles.tabTextSelected]}
                weight={selected ? 'bold' : 'medium'}
              >
                {TAB_LABELS[tab]}
              </PretendardText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.paper}>
          <PretendardText style={styles.bodyText} selectable>
            {TAB_TEXTS[selectedTab]}
          </PretendardText>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  // 고정 높이를 주지 않는다 — Dynamic Type에서 라벨이 잘린다. 세로 여백으로 44pt를 만든다.
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Color.chipBorder,
    backgroundColor: Color.background,
  },
  tabSelected: {
    backgroundColor: Color.chipActiveBg,
    borderColor: Color.chipActiveBg,
  },
  tabText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  tabTextSelected: {
    color: Color.background,
  },
  content: {
    flex: 1,
  },
  // 긴 법률 문서라 종이 면 위에 올린다(ACG) — 지면의 그레인·측량 마크·라임 트레일이
  // 글줄 사이로 지나가 읽기 어려웠다(2026-08-04 시뮬레이터 확인).
  contentInner: {
    paddingBottom: 40,
  },
  paper: {
    padding: 16,
    marginBottom: 24,
    backgroundColor: Acg.controlFill,
  },
  bodyText: {
    fontSize: AcgFontSize.meta,
    lineHeight: 20,
    color: Acg.textMuted,
  },
});

export default InfoPolicyView;
