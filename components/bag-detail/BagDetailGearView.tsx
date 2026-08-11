import { FC, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Gear from '@/model/gear/Gear';
import {
  formatGearWeightOrNull,
  MISSING_WEIGHT_LABEL,
} from '@/model/gear/WeightFormat';
import BagDetail from '@/model/bag-detail/BagDetail';
import app from '@/model/app/App';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidSemantic,
} from '@/constants/DesignTokens';

// 액션 버튼 1개 너비. 스와이프 액션은 `삭제` 하나뿐이라 전체 영역과 같다
// (`수정`은 걷었다 — 2026-08-05 사용자 결정).
const ACTION_WIDTH = 88;

interface RightActionsProps {
  // ReanimatedSwipeable가 넘겨주는 드래그 변위(열릴수록 음수, 닫히면 0).
  drag: SharedValue<number>;
  deleteLabel: string;
  onDelete: () => void;
}

// 드래그 변위에 맞춰 오른쪽에서 슬라이드 인. 닫힘(drag=0) 상태에선 화면 밖으로 밀려 숨겨져
// 살짝 드래그했을 때 액션이 통째로 깜빡이는 문제를 방지한다.
const RightActions: FC<RightActionsProps> = ({
  drag,
  deleteLabel,
  onDelete,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTION_WIDTH }],
  }));

  return (
    <Reanimated.View style={[styles.actionsContainer, animatedStyle]}>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={onDelete}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={deleteLabel}
      >
        {/* 아이콘은 Ionicons로 통일한다 — SF Symbols는 탭바만 쓴다(프로젝트 규칙). */}
        <Ionicons name='trash' size={20} color={Liquid.surface} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          삭제
        </PretendardText>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

interface Props {
  gear: Gear;
  bagDetail: BagDetail;
  /** 카드 안 두 번째 행부터 위에 헤어라인을 둔다 */
  divider?: boolean;
}

// 배낭 상세의 장비 행(BD-1, Liquid Depth). 홈 창고 미리보기와 같은 축약 행(`size='sm'`)이다 —
// 좌측 정체(이름 + 브랜드·색상·사용률 한 줄), 우측 무게 하나. (창고 목록은 'md' 기준이라 더 크다.)
// 썸네일 규칙도 창고와 같다(BD-1 → WH-1) — 사용자가 올린 본인 사진이 있을 때만 좌측에 붙는다.
// 이 컴포넌트는 **본인 배낭 상세 전용**이다 — 공유 배낭(BD-7)은 여기를 쓰지 않고
// `components/shared-bag/SharedBagView.tsx`가 자체 행을 그린다. 제3자 표면의 비공개는
// 그쪽 화면과 데이터 레이어(`BagStore.getSharedBag`가 imageUrl을 채우지 않음)가 함께 지킨다
// (DataModel §1 비공개 원칙).
const BagDetailGearView: FC<Props> = ({ gear, bagDetail, divider = false }) => {
  const isUseless = bagDetail.isUseless(gear);
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handlePressGear = () => {
    app.getAnalyticsManager()?.logClick('gear_item', { from: 'bag_detail' });
    router.push(`/gear-detail/${gear.getId()}`);
  };

  const handlePressDelete = () => {
    swipeableRef.current?.close();
    bagDetail.delete(gear);
  };

  const renderRightActions = (
    _progress: SharedValue<number>,
    drag: SharedValue<number>
  ) => (
    <RightActions
      drag={drag}
      deleteLabel={`${gear.getDisplayName()} 삭제`}
      onDelete={handlePressDelete}
    />
  );

  // 브랜드·색상·사용률을 한 줄로 잇는다(핸드오프 MetricRow) — 값이 없는 조각은 빼서
  // ` · `가 홀로 남지 않게 한다. 표시는 getDisplayColor()로 통일한다(DM-3) —
  // getColor()는 원본값이라 같은 장비가 창고에서 `Black`, 여기서 `black`으로 갈렸다.
  const meta = [
    gear.getDisplayCompany(),
    gear.getDisplayColor(),
    gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const weight = formatGearWeightOrNull(gear.getWeight());

  /**
   * 창고 목록 행과 같은 문법으로 읽는다(WH-1) — 브랜드는 이름을 여는 라벨이라 쉼표 없이
   * 붙이고, 그 뒤 사실들만 쉼표로 나눈다. 없는 값은 조각째 뺀다.
   * BD-5 `사용 안 함`은 눈으로는 로고 마크가 말하는 상태라 문장 끝에 덧붙인다.
   */
  const getAccessibilityLabel = (): string =>
    [
      [gear.getDisplayCompany(), gear.getDisplayName()]
        .filter(Boolean)
        .join(' '),
      weight ?? MISSING_WEIGHT_LABEL,
      gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : null,
      isUseless ? '사용 안 함' : null,
    ]
      .filter(Boolean)
      .join(', ');

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      {/* 불투명 면 — 스와이프 전환 중 뒤 액션색이 행 밑으로 비치지 않게 한다(BagItemView와 동일). */}
      <View style={styles.rowSurface}>
        <TouchableOpacity
          onPress={handlePressGear}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel={getAccessibilityLabel()}
        >
          <LiquidMetricRow
            size='sm'
            name={gear.getDisplayName()}
            meta={meta}
            value={weight}
            divider={divider}
            // 정체가 두 줄인 행과 세 줄인 행의 키를 같게 묶는다(BD-1 행 높이 계약).
            minContentHeight={LiquidLayout.rowMinContent}
            // BD-5: useless 장비는 행 본문(정체·수치)을 낮춘다. 로고 마크는 자체 투명도를 갖는다.
            dim={isUseless}
            // BD-5: 로고 마크는 지표 컬럼의 **왼쪽**에 둬 무게 컬럼의 세로 정렬을 유지한다.
            aside={
              isUseless ? (
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={styles.uselessMark}
                />
              ) : null
            }
          />
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  rowSurface: {
    backgroundColor: Liquid.surface,
  },
  // BD-5 useless 로고 마크. 행 최소 높이 계약(`minContentHeight`)과 같은 한 변을 쓴다 —
  // 마크가 붙은 행만 키가 커지지 않는다.
  uselessMark: {
    width: LiquidLayout.rowMinContent,
    height: LiquidLayout.rowMinContent,
    resizeMode: 'contain',
    opacity: 0.5,
    transform: [{ rotate: '-10.78deg' }],
  },
  // 여백을 주지 않는다. 행 간격은 카드의 margin이 아니라 카드 안 헤어라인이 맡는다 —
  // 패널에 여백을 주면 카드보다 그만큼 짧아진다(2026-08-04 사용자 지적).
  actionsContainer: {
    width: ACTION_WIDTH,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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

export default observer(BagDetailGearView);
