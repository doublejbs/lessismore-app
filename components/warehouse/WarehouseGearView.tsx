import { FC, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Warehouse from '@/model/warehouse/Warehouse';
import Gear from '@/model/gear/Gear';
import { formatGearWeightOrNull } from '@/model/gear/WeightFormat';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import LedgerRow, {
  LEDGER_MISSING_VALUE_LABEL,
} from '@/components/ledger/LedgerRow';
import { LedgerColor, LedgerType } from '@/constants/LedgerTokens';

// 삭제 액션 버튼 너비. 액션은 `삭제` 하나뿐이라 전체 액션 영역과 같다.
const ACTION_WIDTH = 88;

// 누름은 투명도만 낮춘다 — 색을 바꾸거나 크기를 줄이지 않는다.
const PRESS_OPACITY = 0.7;

interface RightActionsProps {
  // ReanimatedSwipeable가 넘겨주는 드래그 변위(열릴수록 음수, 닫히면 0).
  drag: SharedValue<number>;
  label: string;
  onDelete: () => void;
}

// 드래그 변위에 맞춰 오른쪽에서 슬라이드 인. 닫힘(drag=0) 상태에선 화면 밖으로 밀려 숨겨져
// 살짝 드래그했을 때 액션이 통째로 깜빡이는 문제를 방지한다.
const RightActions: FC<RightActionsProps> = ({ drag, label, onDelete }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTION_WIDTH }],
  }));

  return (
    <Reanimated.View style={[styles.actionsContainer, animatedStyle]}>
      {/* 글자만 둔다 — 원장에서 아이콘은 크롬(뒤로·검색·추가)의 것이고, 액션이 하나뿐인
          자리에 휴지통 글리프를 더해도 `삭제`가 말하는 것을 반복할 뿐이다. */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onDelete}
        activeOpacity={PRESS_OPACITY}
        accessibilityRole='button'
        accessibilityLabel={label}
      >
        <PretendardText style={styles.actionLabel} weight='semibold'>
          삭제
        </PretendardText>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

interface Props {
  gear: Gear;
  warehouse: Warehouse;
  /** 두 번째 행부터 위에 헤어라인을 둔다 — 첫 행 위는 컨트롤 줄의 구역 경계가 맡는다 */
  divider?: boolean;
}

/**
 * WH-1 창고 원장 한 행 (Ledger).
 *
 * 좌측은 정체(이름 → 메타 한 줄), 우측은 무게 하나다. 면·그림자·모서리·썸네일이 없고
 * 행 사이는 헤어라인 하나다 — 그림은 `LedgerRow`가 그리고 이 파일은 **무엇을 넣을지**와
 * 스와이프 삭제만 맡는다.
 */
const WarehouseGearView: FC<Props> = ({ gear, warehouse, divider = false }) => {
  const alertManager = app.getAlertManager();
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handlePressDelete = () => {
    swipeableRef.current?.close();
    alertManager?.show({
      message: `${gear.getDisplayName()}을 삭제하시겠습니까?`,
      confirmText: '삭제하기',
      onConfirm: async () => {
        await warehouse.remove(gear);
        app
          .getAnalyticsManager()
          ?.logClick('gear_delete', { from: 'warehouse' });
      },
    });
  };

  const handlePressDetail = () => {
    app.getAnalyticsManager()?.logClick('gear_item', { from: 'warehouse' });
    router.push(`/gear-detail/${gear.getId()}`);
  };

  const renderRightActions = (
    _progress: SharedValue<number>,
    drag: SharedValue<number>
  ) => (
    <RightActions
      drag={drag}
      label={`${gear.getDisplayName()} 삭제`}
      onDelete={handlePressDelete}
    />
  );

  /**
   * 메타는 **브랜드와 사용률을 한 줄**로 잇는다(Ledger 이식).
   *
   * Liquid 세대는 브랜드를 이름 위 별도 줄로 세워 행이 세 줄이었다 — 세로로 훑어 비교하는
   * 목록에서 줄이 하나 늘면 화면에 들어오는 행 수가 그만큼 줄고, 브랜드는 이름을 여는
   * 라벨이라 메타와 같은 급이다. 사용 기록이 없으면 사용률 조각을 뺀다 — `사용률 0%`로
   * 적으면 "담아 갔지만 안 썼다"는 뜻이 되어 담은 적 없는 장비를 잘못 말한다(WH-2-1과
   * 같은 전제).
   */
  const meta =
    [
      gear.getDisplayCompany(),
      gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : '',
    ]
      .filter(Boolean)
      .join(' · ') || undefined;
  const weight = formatGearWeightOrNull(gear.getWeight());

  /**
   * 스크린리더는 행을 한 문장으로 읽는다 — 눈으로 훑는 두 줄과 우측 무게가 같은 순서로
   * 들리게 잇는다. 없는 값은 조각째 빼서 빈 쉼표가 들리지 않게 한다.
   */
  const getAccessibilityLabel = (): string =>
    [gear.getDisplayName(), weight ?? LEDGER_MISSING_VALUE_LABEL, meta]
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
      {/* 불투명 면 — 스와이프 전환 중 뒤 액션색이 행 밑으로 비치지 않게 한다. */}
      <View style={styles.rowSurface}>
        <TouchableOpacity
          onPress={handlePressDetail}
          activeOpacity={PRESS_OPACITY}
          accessibilityRole='button'
          accessibilityLabel={getAccessibilityLabel()}
        >
          <LedgerRow
            name={gear.getDisplayName()}
            value={weight}
            divider={divider}
            {...(meta ? { meta } : {})}
          />
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  rowSurface: {
    backgroundColor: LedgerColor.page,
  },
  // 여백을 주지 않는다 — 행 간격은 헤어라인이 맡고, 액션 면은 행 높이를 그대로 채운다.
  actionsContainer: {
    width: ACTION_WIDTH,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  // 파괴적 액션은 의미색 — 리디자인해도 바꾸지 않는다. 모서리는 깎지 않는다(각진 면 그대로).
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LedgerColor.danger,
  },
  actionLabel: {
    fontSize: LedgerType.label.fontSize,
    lineHeight: LedgerType.label.lineHeight,
    color: LedgerColor.page,
  },
});

export default WarehouseGearView;
