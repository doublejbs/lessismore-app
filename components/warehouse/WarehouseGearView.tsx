import { FC, useRef } from 'react';
import { observer } from 'mobx-react-lite';
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
import { Acg, AcgType } from '@/constants/DesignTokens';

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
        <IconSymbol name='trash.fill' size={20} color={Acg.paper} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          {app.getL10n().t('common.delete')}
        </PretendardText>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

interface Props {
  // 위 행과 가르는 헤어라인(목록 첫 행에는 없다) — 공용 `GearView`로 그대로 넘긴다.
  divided?: boolean;
  gear: Gear;
  warehouse: Warehouse;
}

const WarehouseGearView: FC<Props> = ({ gear, warehouse, divided = false }) => {
  const alertManager = app.getAlertManager();
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handlePressDelete = () => {
    swipeableRef.current?.close();
    alertManager?.show({
      message: app.getL10n().t('warehouse.deleteConfirm', {
        name: gear.getDisplayName(),
      }),
      confirmText: app.getL10n().t('warehouse.deleteAction'),
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
      label={app.getL10n().t('warehouse.deleteAccessibility', {
        name: gear.getDisplayName(),
      })}
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
        <GearView gear={gear} onPress={handlePressDetail} divided={divided} />
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  // 행 표현(헤어라인·타이포)은 공용 `GearView`가 그린다 — 여기는 스와이프 액션만 맡는다.
  rowBackground: {
    backgroundColor: 'transparent',
  },
  // 여백을 주지 않는다. 행 간격은 카드의 margin이 아니라 스크롤 컨테이너의 gap(외부)이라,
  // 패널에 여백을 주면 카드보다 그만큼 짧아진다.
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
    ...AcgType.meta,
    color: Acg.paper,
  },
});

export default observer(WarehouseGearView);
