import { FC, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '@/components/Layout';
import InfoSubScreenHeaderView, {
  IOS_EDGES,
  IS_IOS,
  NATIVE_HEADER_HEIGHT,
} from '@/components/info/InfoSubScreenHeaderView';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidChip from '@/components/liquid/LiquidChip';
import {
  Liquid,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
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
    <Layout
      edges={IS_IOS ? IOS_EDGES : undefined}
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      <InfoSubScreenHeaderView title='약관 및 정책' />

      {/* 칩 하나하나가 `tab`이므로 감싸는 줄은 `tablist`다 — 스크린리더가 "2개 중 1번째 탭"으로
          읽어야 두 문서 사이를 오갈 수 있다는 것이 전해진다. */}
      <View
        accessibilityRole='tablist'
        style={[
          styles.tabRow,
          // iOS는 투명 네이티브 헤더가 상단을 덮으므로 그만큼 내려서 시작한다(LG-1).
          IS_IOS && { marginTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
      >
        {TAB_ORDER.map(tab => (
          <LiquidChip
            key={tab}
            label={TAB_LABELS[tab]}
            selected={tab === selectedTab}
            onPress={() => setSelectedTab(tab)}
            role='tab'
          />
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* 긴 법률 문서라 흰 카드 위에 올린다 — 지면의 라임 글로우가 글줄 사이로 지나가면
            읽기 흐름이 끊긴다. */}
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
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 40,
  },
  paper: {
    padding: 18,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  bodyText: {
    fontSize: LiquidType.bodySm.fontSize,
    // 수천 자를 잇는 전문이라 본문 스케일(19)보다 줄간을 벌린다.
    lineHeight: 21,
    color: Liquid.inkSecondary,
  },
});

export default InfoPolicyView;
