import { FC, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { observer } from 'mobx-react-lite';
import BagUseless from '@/model/bag-useless/BagUseless';
import app from '@/model/app/App';
import Gear from '@/model/gear/Gear';
import { formatBagWeight } from '@/model/gear/WeightFormat';
import BagUselessGearView from './BagUselessGearView';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidGlassCapsule from '@/components/liquid/LiquidGlassCapsule';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidProgressBar from '@/components/liquid/LiquidProgressBar';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  bagUseless: BagUseless;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

// 투명 헤더와 본문 타이틀 사이 간격(창고 화면과 같은 값) — 바 버튼과 타이틀이 붙어 보이지 않게 한다.
const HEADER_TOP_GAP = 6;

// 진행 바 두께. 히어로 자리라 목록 카드의 6보다 굵다(핸드오프 ProgressBar h8).
const BAR_HEIGHT = 8;

// 고른 개수 글자 크기(패킹 진행 카드와 같은 값). 부모 라인박스가 같은 값을 써야 어센더가 깎이지 않는다.
const COUNT_FONT_SIZE = 52;

// 텍스트 알약 내부 좌우 여백(목업 §7) — 아이콘 칸을 담는 캡슐(5)보다 넓다.
const SELECT_ALL_PILL_PAD_H = 14;

// 합산은 g로 하고 표시만 kg로 바꾼다(DM-26) — 패킹 진행 카드와 같은 표기여야 한다.
const sumWeightGram = (gears: Gear[]) =>
  gears.reduce((acc, gear) => acc + Number(gear.getWeight() || 0), 0);

/**
 * BD-5 사용 기록 화면 (Liquid Depth).
 *
 * 여행에서 실제로 쓴 장비를 고르는 **할 일 목록**이라 패킹 모드(목업 §7)와 같은 얼개를 쓴다 —
 * 지형 + 짙은 베일 지면, 상단에 고정된 유리 진행 카드, 그 아래로 흐르는 체크 행 목록.
 * `전체 선택`/`전체 해제`는 패킹의 `처음부터 다시`와 같은 자리(유리 텍스트 알약)에 둔다 —
 * 진행 카드 안에 두면 라임 퍼센트 알약과 자리를 다툰다.
 */
const BagUselessView: FC<Props> = ({ bagUseless }) => {
  const insets = useSafeAreaInsets();
  const isInitialized = bagUseless.isInitialized();
  const allCount = bagUseless.getAllCount();
  const selectedCount = bagUseless.getSelectedCount();
  const gears = bagUseless.getGears();

  const handlePressToggleSelectAll = () => {
    app.getAnalyticsManager()?.logClick('useless_select_all', {
      selected: selectedCount === 0,
    });
    bagUseless.toggleSelectAll();
  };

  const handlePressConfirm = () => {
    app.getAnalyticsManager()?.logClick('useless_confirm');
    bagUseless.save();
  };

  const handlePressBack = () => {
    bagUseless.back();
  };

  const renderGearItem = ({ item }: { item: Gear }) => (
    <BagUselessGearView gear={item} bagUseless={bagUseless} />
  );

  useEffect(() => {
    bagUseless.initialize();
  }, []);

  const percent =
    allCount > 0 ? Math.round((selectedCount / allCount) * 100) : 0;
  const selectAllLabel = selectedCount ? '전체 해제' : '전체 선택';

  // LG-1: iOS만 네이티브 투명 헤더 — 큰 안내 문구는 내비 타이틀이 아니라 본문 콘텐츠라
  // headerTitle은 비워 둔다. 우측은 전체 선택·해제 토글이다.
  const stackScreen = (
    <Stack.Screen
      options={{
        headerShown: IS_IOS,
        headerTransparent: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerRight: () => (
          <TouchableOpacity
            onPress={handlePressToggleSelectAll}
            activeOpacity={LiquidMotion.pressOpacity}
            style={styles.nativeSelectAllButton}
            accessibilityRole='button'
            accessibilityLabel={selectAllLabel}
          >
            <PretendardText style={styles.selectAllLabel} weight='semibold'>
              {selectAllLabel}
            </PretendardText>
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (!isInitialized) {
    // 초기화 전에는 목록을 그리지 않는다 — 지면만 먼저 깔아 빈 화면이 번쩍이지 않게 한다.
    return <View style={styles.container}>{stackScreen}</View>;
  }

  const totalWeight = formatBagWeight(sumWeightGram(gears));
  const selectedWeight = formatBagWeight(
    sumWeightGram(gears.filter(gear => bagUseless.isSelected(gear)))
  );

  return (
    <View
      style={[
        styles.container,
        // LG-1: 큰 안내 타이틀이 상단 고정 콘텐츠라 헤더 뒤로 흐를 수 없다 — 투명 헤더
        // (상태바 + 44pt) 아래에서 시작하도록 여백을 주고, 바 버튼과 타이틀이 붙어 보이지
        // 않게 간격을 더한다(창고 화면과 같은 값).
        IS_IOS && {
          paddingTop: insets.top + LiquidLayout.navBar + HEADER_TOP_GAP,
        },
      ]}
    >
      {stackScreen}

      {!IS_IOS && (
        <View style={styles.chrome}>
          <LiquidGlassCircleButton
            icon='chevron-back'
            onPress={handlePressBack}
            accessibilityLabel='뒤로가기'
          />
          <LiquidGlassCapsule
            paddingHorizontal={SELECT_ALL_PILL_PAD_H}
            onPress={handlePressToggleSelectAll}
            accessibilityLabel={selectAllLabel}
          >
            {/* 한글이라 콘덴스드를 쓰지 않는다 — Archivo Narrow에 한글 글리프가 없다. */}
            <PretendardText weight='semibold' style={styles.selectAllLabel}>
              {selectAllLabel}
            </PretendardText>
          </LiquidGlassCapsule>
        </View>
      )}

      <View style={styles.titleColumn}>
        <PretendardText weight='bold' style={styles.title}>
          실제로 사용했던 장비만
        </PretendardText>
        <PretendardText weight='bold' style={styles.title}>
          선택해주세요
        </PretendardText>
      </View>

      <View style={styles.progressWrap}>
        <LiquidCard tone='glass' radius='hero' padding={LiquidLayout.cardPadLg}>
          {/* 개수와 퍼센트는 같은 사실의 두 표현이라 한 덩어리로 읽는다. */}
          <View
            style={styles.countRow}
            accessible
            accessibilityLabel={`사용 ${selectedCount}/${allCount}, ${percent}%`}
          >
            {/* 부모 라인박스를 자식 최대 크기로 잡는다 — 없으면 큰 숫자의 어센더가 깎인다. */}
            <PretendardText style={styles.countWrap} numberOfLines={1}>
              <PretendardText style={styles.countValue}>
                {selectedCount}
              </PretendardText>
              <PretendardText style={styles.countTotal}>
                {` / ${allCount}`}
              </PretendardText>
            </PretendardText>
            {/* 이 화면의 유일한 라임 면 — 진행률 하나만 액센트를 받는다.
                단 **값이 0이면 라임을 걷는다**(2026-08-11 개정, 패킹 헤더 PK-3과 같은 규칙):
                하나도 고르지 않은 상태가 화면에서 가장 강조되면 액센트가 뜻을 잃는다. */}
            <View
              style={[
                styles.percentBadge,
                percent > 0
                  ? styles.percentBadgeAccent
                  : styles.percentBadgeQuiet,
              ]}
            >
              <PretendardText
                style={[
                  styles.percentText,
                  percent === 0 && styles.percentTextQuiet,
                ]}
              >
                {`${percent}%`}
              </PretendardText>
            </View>
          </View>

          {/* 유리 면 위라 채움은 잉크다(라임은 위 알약이 이미 갖고 있다). */}
          <View style={styles.bar}>
            <LiquidProgressBar
              percent={percent}
              tone='ink'
              height={BAR_HEIGHT}
            />
          </View>

          <PretendardText
            style={styles.weightText}
            accessibilityLabel={`사용한 무게 ${selectedWeight}, 총 무게 ${totalWeight}`}
          >
            {`${selectedWeight} / ${totalWeight}`}
          </PretendardText>
        </LiquidCard>
      </View>

      <FlatList
        data={gears}
        renderItem={renderGearItem}
        keyExtractor={item => item.getId()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.confirmWrapper}>
        <LiquidPillButton
          label='완료'
          variant='primary'
          block
          onPress={handlePressConfirm}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    height: '100%',
  },
  // Android·Web 크롬 — iOS는 같은 그림을 네이티브 투명 헤더가 내준다(LG-1).
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  // iOS 네이티브 headerRight 텍스트 버튼 — HIG 최소 터치 타깃 44pt 확보.
  nativeSelectAllButton: {
    minHeight: LiquidLayout.touchMin,
    justifyContent: 'center',
  },
  selectAllLabel: {
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
  titleColumn: {
    flexDirection: 'column',
  },
  title: {
    fontSize: LiquidType.title2.fontSize,
    lineHeight: LiquidType.title2.lineHeight,
    letterSpacing: LiquidType.title2.letterSpacing,
    color: Liquid.ink,
  },
  progressWrap: {
    marginTop: LiquidLayout.section,
    marginBottom: LiquidLayout.cardPad,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  countWrap: {
    flexShrink: 1,
    fontSize: COUNT_FONT_SIZE,
    lineHeight: COUNT_FONT_SIZE,
  },
  countValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: COUNT_FONT_SIZE,
    lineHeight: COUNT_FONT_SIZE,
    letterSpacing: -1.5,
    color: Liquid.ink,
  },
  // 전체 개수는 한 단계 낮춘다 — 시선이 먼저 닿아야 하는 값은 고른 개수다.
  countTotal: {
    fontFamily: LiquidFont.condensed,
    fontSize: 24,
    color: Liquid.inkSubtle,
  },
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 알약이 깨지지 않는다.
  percentBadge: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: LiquidRadius.pill,
  },
  percentBadgeAccent: {
    backgroundColor: Liquid.lime,
  },
  // 진행 0의 자리 — 중립 배지 면(카드 위에서 구분은 되지만 시선을 끌지 않는 최소 대비).
  percentBadgeQuiet: {
    backgroundColor: Liquid.badgeFill,
  },
  percentText: {
    fontFamily: LiquidFont.condensed,
    fontSize: 16,
    color: Liquid.limeOn,
  },
  percentTextQuiet: {
    color: Liquid.inkSecondary,
  },
  bar: {
    marginTop: 16,
  },
  weightText: {
    marginTop: 12,
    fontFamily: LiquidFont.condensed,
    fontSize: 14,
    color: Liquid.inkTertiary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    // 행이 각자 카드 면이라 카드 사이 간격으로 벌린다.
    gap: LiquidLayout.listGap,
    paddingBottom: LiquidLayout.cardPad,
  },
  confirmWrapper: {
    width: '100%',
    paddingVertical: 12,
  },
});

export default observer(BagUselessView);
