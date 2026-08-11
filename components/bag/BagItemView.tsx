import { FC, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import BagTripSection from '@/model/bag/BagTripSection';
import {
  formatBagWeight,
  formatBagWeightValue,
} from '@/model/gear/WeightFormat';
import { isCondensedLabel } from '@/model/home/HomeTripPlan';
import PretendardText from '@/components/PretendardText';
import LiquidProgressBar from '@/components/liquid/LiquidProgressBar';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidSemantic,
  LiquidShadow,
} from '@/constants/DesignTokens';

// 액션 버튼 1개 너비. 전체 액션 영역 = ACTION_WIDTH * 2.
const ACTION_WIDTH = 72;
const ACTIONS_TOTAL_WIDTH = ACTION_WIDTH * 2;

interface RightActionsProps {
  // ReanimatedSwipeable가 넘겨주는 드래그 변위(열릴수록 음수, 닫히면 0).
  drag: SharedValue<number>;
  onCopy: () => void;
  onDelete: () => void;
}

// 드래그 변위에 맞춰 오른쪽에서 슬라이드 인. 닫힘(drag=0) 상태에선 화면 밖으로 밀려 숨겨져
// 살짝 드래그했을 때 액션이 통째로 깜빡이는 문제를 방지한다.
const RightActions: FC<RightActionsProps> = ({ drag, onCopy, onDelete }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTIONS_TOTAL_WIDTH }],
  }));

  return (
    <Reanimated.View style={[styles.actionsContainer, animatedStyle]}>
      <TouchableOpacity
        style={[styles.actionButton, styles.copyAction]}
        onPress={onCopy}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='배낭 복사'
      >
        <IconSymbol name='doc.on.doc' size={20} color={Liquid.surface} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          복사
        </PretendardText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={onDelete}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='배낭 삭제'
      >
        <IconSymbol name='trash.fill' size={20} color={Liquid.surface} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          삭제
        </PretendardText>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

interface Props {
  bagItem: BagItem;
  bag: Bag;
  // 카드 톤을 가르는 구간. 지난 여행은 조용한 면으로 낮춘다(핸드오프 §5).
  section: BagTripSection;
  // 예정·여행 중 카드의 D-day 라벨. 계산은 호출측이 한다 — 자정 기준 날짜를 화면이 들고 있다.
  dDayLabel?: string | null;
  // 가장 임박한 배낭 한 장. 라임 배지와 진행 줄은 이 카드에만 붙는다(화면당 라임 면 1개).
  imminent?: boolean;
}

/**
 * BAG-1 배낭 카드 (Liquid Depth).
 *
 * 예정은 흰 종이 카드, 지난 여행은 `surfaceQuiet` + 0.5px 보더로 낮춘다 —
 * 목록을 훑을 때 **앞으로 갈 여행만** 눈에 걸려야 한다.
 * 진행 줄(`{n}/{m}`)은 홈 히어로·패킹 헤더와 같은 `BagItem` 값을 읽는다(세 곳이 어긋나면 안 됨).
 */
const BagItemView: FC<Props> = ({
  bagItem,
  bag,
  section,
  dDayLabel = null,
  imminent = false,
}) => {
  // 날짜 없는 레거시 배낭은 null(GD-10) — 'Invalid Date'를 그리지 않는다.
  const date = bagItem.getDisplayDate();
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const isPast = section === BagTripSection.Past;
  const gearCount = bagItem.getGearCount();
  const packedCount = bagItem.getPackedGearCount();
  // 진행 줄은 가장 임박한 카드에만 둔다. 담긴 장비가 없으면 그릴 값이 없다.
  const showProgress = imminent && gearCount > 0;

  const handleClick = () => {
    app.getAnalyticsManager()?.logClick('bag_item');
    router.push(`/bag/${bagItem.getID()}`);
  };

  const handleClickDelete = () => {
    swipeableRef.current?.close();
    bag.delete(bagItem);
  };

  const handleClickCopy = () => {
    swipeableRef.current?.close();

    if (!app.getFirebase()?.isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    router.push({
      pathname: '/bag-copy',
      params: {
        sourceId: bagItem.getID(),
        sourceName: bagItem.getName(),
        entrySource: 'list',
      },
    });
  };

  const renderRightActions = (
    _progress: SharedValue<number>,
    drag: SharedValue<number>
  ) => (
    <RightActions
      drag={drag}
      onCopy={handleClickCopy}
      onDelete={handleClickDelete}
    />
  );

  /**
   * 배지는 구간마다 뜻이 다르다 — 예정은 **언제 떠나는지**(D-day), 지난 여행은
   * **다 챙겼는지**(패킹)가 남는 정보다. 두 개를 함께 달면 카드마다 배지가 두 줄이 된다.
   */
  const getBadgeLabel = (): string | null => {
    if (isPast) {
      if (bagItem.isPackingComplete()) {
        return '패킹 완료';
      }

      return bagItem.hasPackingRecord()
        ? `패킹 ${bagItem.getPackingPercent()}%`
        : null;
    }

    return dDayLabel;
  };

  const badgeLabel = getBadgeLabel();

  const renderBadge = () => {
    if (badgeLabel === null) {
      return null;
    }

    if (isPast) {
      const isComplete = bagItem.isPackingComplete();

      return (
        <View
          style={[
            styles.badge,
            isComplete ? styles.badgeInk : styles.badgeQuiet,
          ]}
        >
          {isComplete ? (
            <Ionicons name='checkmark' size={12} color={Liquid.lime} />
          ) : null}
          <PretendardText
            weight='semibold'
            style={[
              styles.badgeTextKorean,
              isComplete ? styles.badgeTextOnInk : styles.badgeTextOnQuiet,
            ]}
          >
            {badgeLabel}
          </PretendardText>
        </View>
      );
    }

    // `D-6`은 콘덴스드, `오늘 출발`·`패킹 40%`는 본문 서체 — 홈 히어로와 같은 판정을 쓴다.
    const isCondensed = isCondensedLabel(badgeLabel);

    return (
      <View
        style={[styles.badge, imminent ? styles.badgeLime : styles.badgeQuiet]}
      >
        <PretendardText
          weight='semibold'
          style={[
            isCondensed ? styles.badgeTextCondensed : styles.badgeTextKorean,
            imminent ? styles.badgeTextOnLime : styles.badgeTextOnQuiet,
          ]}
        >
          {badgeLabel}
        </PretendardText>
      </View>
    );
  };

  // 배지·진행은 카드 안 텍스트지만 행 전체가 하나의 버튼이라 라벨에 함께 실어야 읽힌다.
  const accessibilityLabel = [
    badgeLabel,
    bagItem.getName(),
    date,
    formatBagWeight(bagItem.getWeightGram()),
    showProgress ? `패킹 ${packedCount}/${gearCount}` : null,
  ]
    .filter(part => part !== null)
    .join(', ');

  return (
    <View style={[styles.shell, !isPast && styles.shellPaper]}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderRightActions}
        // 기본 컨테이너가 overflow: hidden이라 카드 모서리를 여기서 깎는다 —
        // 그림자는 바깥 껍데기(shell)가 들고 있어 잘리지 않는다.
        containerStyle={[
          styles.swipeContainer,
          isPast && styles.swipeContainerQuiet,
        ]}
      >
        <TouchableOpacity
          style={[styles.card, isPast ? styles.cardQuiet : styles.cardPaper]}
          onPress={handleClick}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel={accessibilityLabel}
        >
          <View style={styles.header}>
            {/* 좌 정체 컬럼 — 배지·이름(말줄임)·기간 */}
            <View style={styles.identityColumn}>
              {renderBadge()}
              <PretendardText
                weight='semibold'
                style={styles.name}
                numberOfLines={1}
              >
                {bagItem.getName()}
              </PretendardText>
              {/* 기간은 숫자·구분자뿐이라 콘덴스드가 안전하다. */}
              {date ? (
                <PretendardText style={styles.date} numberOfLines={1}>
                  {date}
                </PretendardText>
              ) : null}
            </View>

            {/* 우 지표 컬럼 — 총 무게. 행마다 같은 자리에 와야 배낭끼리 비교된다. */}
            <PretendardText style={styles.weightWrap} numberOfLines={1}>
              <PretendardText
                style={[styles.weightValue, isPast && styles.weightValueQuiet]}
              >
                {formatBagWeightValue(bagItem.getWeightGram())}
              </PretendardText>
              <PretendardText
                style={[styles.weightUnit, isPast && styles.weightUnitQuiet]}
              >
                kg
              </PretendardText>
            </PretendardText>
          </View>

          {showProgress ? (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <LiquidProgressBar
                  percent={bagItem.getPackingPercent()}
                  height={6}
                />
              </View>
              <PretendardText style={styles.progressValue}>
                {`${packedCount}/${gearCount}`}
              </PretendardText>
            </View>
          ) : null}
        </TouchableOpacity>
      </ReanimatedSwipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  // 그림자는 껍데기가 든다 — 스와이프 컨테이너가 overflow: hidden이라 안쪽에 걸면 잘린다.
  shell: {
    borderRadius: LiquidRadius.card,
    marginBottom: LiquidLayout.listGap,
  },
  // 지난 카드는 그림자 없이 보더로만 지면과 떨어진다 — 이 스타일이 붙지 않는다.
  shellPaper: {
    boxShadow: LiquidShadow.card,
  },
  swipeContainer: {
    borderRadius: LiquidRadius.card,
  },
  // 지난 카드는 그림자 대신 0.5px 보더로 지면에서 떨어뜨린다(핸드오프 quiet 카드).
  swipeContainerQuiet: {
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
  },
  card: {
    padding: 18,
  },
  cardPaper: {
    backgroundColor: Liquid.surface,
  },
  cardQuiet: {
    backgroundColor: Liquid.surfaceQuiet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identityColumn: {
    flex: 1,
    minWidth: 0,
  },
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 잘리지 않는다.
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 22,
    paddingHorizontal: 8,
    // pill(999) — 고정 반지름이면 Dynamic Type으로 높이가 22를 넘을 때 알약이 깨진다.
    borderRadius: LiquidRadius.pill,
    marginBottom: 8,
  },
  badgeLime: {
    backgroundColor: Liquid.lime,
  },
  badgeQuiet: {
    backgroundColor: Liquid.badgeFill,
  },
  badgeInk: {
    backgroundColor: Liquid.ink,
  },
  // 크기와 색을 나눠 둔다 — 합치면 뒤에 온 색 스타일이 콘덴스드 크기를 덮는다.
  badgeTextCondensed: {
    fontFamily: LiquidFont.condensed,
    fontSize: 12,
  },
  badgeTextKorean: {
    fontSize: 11.5,
  },
  badgeTextOnLime: {
    color: Liquid.limeOn,
  },
  badgeTextOnQuiet: {
    color: Liquid.inkSecondary,
  },
  badgeTextOnInk: {
    color: Liquid.surface,
  },
  name: {
    fontSize: 17,
    lineHeight: 24,
    color: Liquid.ink,
  },
  date: {
    marginTop: 4,
    fontFamily: LiquidFont.condensed,
    fontSize: 12.5,
    letterSpacing: 0.63, // .05em
    color: Liquid.inkMuted,
  },
  // 부모 라인박스를 자식 최대 크기(30)로 잡는다 — 없으면 numberOfLines={1}에서
  // 큰 자식이 잘릴 수 있다(특히 Android).
  weightWrap: {
    flexShrink: 0,
    textAlign: 'right',
    fontSize: 30,
    lineHeight: 32,
  },
  weightValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: Liquid.ink,
  },
  weightValueQuiet: {
    color: Liquid.inkSecondary,
  },
  // 단위도 Archivo — 목업이 kg를 숫자와 같은 스팬에 넣는다(라틴 전용이라 안전).
  weightUnit: {
    fontFamily: LiquidFont.condensed,
    fontSize: 14,
    color: Liquid.inkMuted,
  },
  weightUnitQuiet: {
    color: Liquid.inkSubtle,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  progressTrack: {
    flex: 1,
  },
  progressValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 13,
    color: Liquid.inkSecondary,
  },
  actionsContainer: {
    width: ACTIONS_TOTAL_WIDTH,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  copyAction: {
    backgroundColor: Liquid.ink,
  },
  // 파괴적 액션은 의미색 — 리디자인해도 바꾸지 않는다.
  deleteAction: {
    backgroundColor: LiquidSemantic.danger,
  },
  actionLabel: {
    fontSize: 12,
    color: Liquid.surface,
  },
});

export default BagItemView;
