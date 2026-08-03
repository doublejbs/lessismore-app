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
import app from '@/model/app/App';
import GearView from '@/components/warehouse/GearView';
import PretendardText from '@/components/PretendardText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Acg, Color } from '@/constants/DesignTokens';

// 삭제 스와이프 액션 배경 — 파괴적 액션 시맨틱 색(DesignTokens 예외, CLAUDE.md 참고).
const DELETE_RED = '#FF3B30';

// 삭제 액션 버튼 너비. 전체 액션 영역 = ACTION_WIDTH.
const ACTION_WIDTH = 80;

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
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={onDelete}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={label}
      >
        <IconSymbol name='trash.fill' size={20} color={Color.background} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          삭제
        </PretendardText>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

interface Props {
  gear: Gear;
  warehouse: Warehouse;
}

const WarehouseGearView: FC<Props> = ({ gear, warehouse }) => {
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
        app.getAnalyticsManager()?.logClick('gear_delete', { from: 'warehouse' });
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

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      {/* 불투명 배경 — 스와이프 전환 중 뒤 삭제색이 행 밑으로 비치지 않게 한다(BagItemView와 동일). */}
      <View style={styles.rowBackground}>
        <GearView gear={gear} onPress={handlePressDetail} />
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  rowBackground: {
    backgroundColor: Color.background,
  },
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
  deleteAction: {
    backgroundColor: DELETE_RED,
  },
  actionLabel: {
    fontSize: 12,
    color: Acg.paper,
  },
});

export default WarehouseGearView;
