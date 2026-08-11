import { FC } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Stack, useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidType,
} from '@/constants/DesignTokens';
import SharedBag from '@/model/shared-bag/SharedBag';
import Gear from '@/model/gear/Gear';
import { formatGearWeightOrNull } from '@/model/gear/WeightFormat';

interface Props {
  sharedBag: SharedBag;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 직접 그린다.
const IS_IOS = Platform.OS === 'ios';

/**
 * CS-8 공유 배낭(다녀온 배낭) 읽기전용 뷰어 (Liquid Depth, 2026-08-11 이식).
 *
 * 배낭 상세(BD-1)와 같은 지면·문법을 쓴다 — 지형 위 짙은 베일에 흰 히어로 카드(총 무게)가
 * 얹히고, 장비는 카드 하나 안에 헤어라인으로 갈려 쌓인다. 편집·패킹·삭제가 없으므로 라임
 * 면도, 하단 CTA도 두지 않는다 — 이 화면은 읽는 화면이다.
 */
const SharedBagView: FC<Props> = ({ sharedBag }) => {
  const router = useRouter();

  const handlePressBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const notShared = sharedBag.isNotShared();
  const gears = sharedBag.getGears();
  // 공유 링크 콜드스타트(스택 히스토리 없음)면 시스템 back이 안 나온다 —
  // 기존 홈 이동 폴백(handlePressBack)을 headerLeft로 이관해 뒤로가기 어포던스를 유지한다.
  const needsFallbackBack = IS_IOS && !router.canGoBack();

  return (
    <View style={styles.container}>
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
          시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
          **타이틀은 비운다** — 배낭 이름은 본문 제목 블록이 든다(배낭 상세와 같은 처리). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          ...(needsFallbackBack && {
            headerLeft: () => (
              <LiquidGlassCircleButton
                icon='chevron-back'
                onPress={handlePressBack}
                accessibilityLabel='뒤로 가기'
              />
            ),
          }),
        }}
      />
      {!IS_IOS && (
        <View style={styles.chrome}>
          <LiquidGlassCircleButton
            icon='chevron-back'
            onPress={handlePressBack}
            accessibilityLabel='뒤로 가기'
          />
        </View>
      )}

      {notShared ? (
        // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions).
        <View style={styles.emptyWrap}>
          <PretendardText weight='bold' style={styles.emptyTitle}>
            공유가 해제된 배낭이에요
          </PretendardText>
          <PretendardText style={styles.emptyText}>
            공유한 사람에게 링크를 다시 받아볼까요?
          </PretendardText>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
          contentInsetAdjustmentBehavior='automatic'
          showsVerticalScrollIndicator={false}
        >
          <PretendardText
            weight='bold'
            style={styles.title}
            numberOfLines={2}
            lineBreakStrategyIOS='hangul-word'
          >
            {sharedBag.getName()}
          </PretendardText>

          {/* 이 화면의 주 수치라 흰 히어로 카드 하나에 총 무게 → 기간 → 규모를 쌓는다.
              무게는 라틴만 든 문자열이라(`3.5kg`) 콘덴스드를 한 덩어리로 쓴다. */}
          <LiquidCard
            tone='paper'
            radius='hero'
            padding={LiquidLayout.cardPadLg}
            style={styles.hero}
          >
            <PretendardText style={styles.weight}>
              {sharedBag.getTotalWeightLabel()}
            </PretendardText>
            <PretendardText style={styles.heroMeta}>
              {[sharedBag.getDateRange(), `장비 ${gears.length}개`]
                .filter(Boolean)
                .join(' · ')}
            </PretendardText>
          </LiquidCard>

          {gears.length > 0 ? (
            // 행이 자기 여백을 들고 있어 카드 패딩은 0이다. `clip`으로 첫·마지막 행이
            // 카드 모서리 밖으로 새지 않게 한다.
            <LiquidCard tone='paper' padding={0} clip>
              {gears.map((gear, index) => (
                <GearRow key={gear.getId()} gear={gear} divider={index > 0} />
              ))}
            </LiquidCard>
          ) : (
            <View style={styles.emptyGears}>
              <PretendardText weight='bold' style={styles.emptyTitle}>
                담긴 장비가 없어요
              </PretendardText>
              <PretendardText style={styles.emptyText}>
                구성이 채워지면 여기에 보여요
              </PretendardText>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

interface GearRowProps {
  gear: Gear;
  divider: boolean;
}

/**
 * 읽기전용 장비 행 — 탭·편집·삭제·체크가 없다. 창고·배낭 상세와 같은 목록 문법
 * (`LiquidMetricRow`)이라 같은 장비가 화면마다 다르게 읽히지 않는다.
 * 장비 썸네일은 표시하지 않는다(DataModel §1 장비 이미지 미제공 원칙 — 공유 경로는
 * 데이터 레이어가 이미 비워 온다).
 */
const GearRow: FC<GearRowProps> = ({ gear, divider }) => {
  const company = gear.getDisplayCompany();

  return (
    <LiquidMetricRow
      size='sm'
      name={gear.getDisplayName()}
      divider={divider}
      value={formatGearWeightOrNull(gear.getWeight())}
      {...(company ? { brand: company } : {})}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 Layout이 받는 LiquidBackdrop이 깐다.
    backgroundColor: 'transparent',
  },
  // 크롬 좌우 여백은 콘텐츠(20)보다 좁다 — 유리 원이 화면 가장자리에 가깝게 앉는다(목업 §6).
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 6,
    paddingBottom: 40,
  },
  title: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  hero: {
    marginTop: 14,
    marginBottom: LiquidLayout.listGap,
    gap: 4,
  },
  /**
   * 라인박스를 글자 크기와 같게 잡는다 — 토큰의 `lineHeight`(38)를 그대로 쓰면 RN에서
   * 콘덴스드 어센더가 깎인다(배낭 상세 히어로와 같은 처리).
   */
  weight: {
    fontFamily: LiquidFont.condensed,
    fontSize: LiquidType.numXl.fontSize,
    lineHeight: LiquidType.numXl.fontSize,
    letterSpacing: LiquidType.numXl.letterSpacing,
    color: Liquid.ink,
  },
  heroMeta: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: LiquidLayout.screenH,
  },
  emptyGears: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
});

export default observer(SharedBagView);
