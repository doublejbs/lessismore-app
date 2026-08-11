import { FC, useMemo, useState } from 'react';
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
import PolicyLineKind from '@/components/info/PolicyLineKind';

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

// 조항 머리(`제1조 (…)`, `부칙 …`). 원문에 `제10조(…)`처럼 공백이 없는 줄도 있어 느슨하게 잡는다.
const HEADING_PATTERN = /^(제\s*\d+\s*조|부칙)/;

// 조항 안 항목 머리(`1. …`, `▶ …`). 번호 뒤 점이 없는 줄(`1 관계 법령…`)은 본문이다.
const SUB_HEADING_PATTERN = /^(\d+\.\s|▶)/;

interface PolicyBlock {
  key: string;
  kind: PolicyLineKind;
  text: string;
  /** 단락이 갈리는 자리(원문의 빈 줄 뒤 · 조항 머리) — 위 여백을 준다 */
  spaced: boolean;
}

/**
 * 원문 문자열을 줄 단위 블록으로 나눈다. **원문은 건드리지 않는다** — 굵기·여백만 렌더에서 낸다.
 * 빈 줄은 블록으로 만들지 않고 다음 블록의 `spaced`로 옮긴다(빈 Text를 그리면 여백이 두 겹이 된다).
 */
const buildPolicyBlocks = (text: string): PolicyBlock[] => {
  const blocks: PolicyBlock[] = [];
  let spaced = false;

  text.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (line.length === 0) {
      spaced = true;

      return;
    }

    const kind = HEADING_PATTERN.test(line)
      ? PolicyLineKind.Heading
      : SUB_HEADING_PATTERN.test(line)
        ? PolicyLineKind.SubHeading
        : PolicyLineKind.Body;
    // 조항 머리는 원문에 빈 줄이 없어도 항상 벌린다. 첫 블록만 예외 — 카드 여백이 이미 있다.
    const needsSpace =
      blocks.length > 0 && (spaced || kind === PolicyLineKind.Heading);

    blocks.push({ key: `${index}`, kind, text: line, spaced: needsSpace });
    spaced = false;
  });

  return blocks;
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
  // 수천 자를 매 렌더마다 다시 쪼개지 않는다 — 문서는 탭을 바꿀 때만 갈린다.
  const blocks = useMemo(
    () => buildPolicyBlocks(TAB_TEXTS[selectedTab]),
    [selectedTab]
  );

  const renderBlock = (block: PolicyBlock) => {
    const isTitle = block.kind !== PolicyLineKind.Body;

    return (
      <PretendardText
        key={block.key}
        weight={isTitle ? 'semibold' : 'regular'}
        style={[
          styles.line,
          isTitle ? styles.titleLine : styles.bodyLine,
          block.spaced && styles.lineSpaced,
        ]}
        selectable
      >
        {block.text}
      </PretendardText>
    );
  };

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
            읽기 흐름이 끊긴다. 조항 제목만 굵기를 올려 훑을 수 있게 한다(2026-08-11 리뷰). */}
        <View style={styles.paper}>{blocks.map(renderBlock)}</View>

        {/* 문서가 여기서 끝난다는 표시 — 스크롤이 수천 pt라 끝까지 읽었는지 알 수 없었다. */}
        <PretendardText style={styles.endMark}>
          문서가 여기서 끝나요.
        </PretendardText>
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
  // 마지막 줄이 화면 밑변에서 잘리지 않게 비운다(끝 표시 + 여백).
  contentInner: {
    paddingBottom: 40,
  },
  paper: {
    padding: 18,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  line: {
    fontSize: LiquidType.bodySm.fontSize,
    // 수천 자를 잇는 전문이라 본문 스케일(19)보다 줄간을 벌린다.
    lineHeight: 21,
  },
  bodyLine: {
    color: Liquid.inkSecondary,
  },
  /**
   * 조항·항목 머리는 본문보다 굵고 진하다. **크기는 본문과 같게 둔다** — 법무 문서라
   * 제목이 커지면 문서가 목차처럼 보이고, 훑기에 필요한 건 굵기와 여백뿐이다.
   */
  titleLine: {
    color: Liquid.ink,
  },
  lineSpaced: {
    marginTop: 14,
  },
  endMark: {
    marginTop: 16,
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
    textAlign: 'center',
  },
});

export default InfoPolicyView;
