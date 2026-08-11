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
import { Ionicons } from '@expo/vector-icons';
import Warehouse from '@/model/warehouse/Warehouse';
import Gear from '@/model/gear/Gear';
import {
  formatGearWeightOrNull,
  MISSING_WEIGHT_LABEL,
} from '@/model/gear/WeightFormat';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import GearThumbnailView, {
  GEAR_THUMBNAIL_SIZE,
} from '@/components/gear/GearThumbnailView';
import { Liquid, LiquidMotion, LiquidSemantic } from '@/constants/DesignTokens';

// 삭제 액션 버튼 너비. 액션은 `삭제` 하나뿐이라 전체 액션 영역과 같다.
const ACTION_WIDTH = 88;

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
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={label}
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
  warehouse: Warehouse;
  /** 카드 안 두 번째 행부터 위에 헤어라인을 둔다 */
  divider?: boolean;
}

/**
 * WH-1 창고 목록 행 (Liquid Depth, 목업 §8).
 *
 * 행마다 면을 두지 않는다 — 목록 전체가 흰 카드 하나이고 행은 헤어라인으로만 갈린다
 * (카드는 `WarehouseScreen`이 그린다). 좌측은 정체(브랜드 → 이름 → 색상·사용률 한 줄),
 * 우측은 무게 하나다 — 무게가 행마다 같은 자리에 와야 세로로 비교된다.
 * 썸네일 규칙은 배낭 상세와 같다(BD-1 → WH-1): 사용자가 올린 본인 사진이 있을 때만 붙는다.
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

  // 색상·사용률을 한 줄로 잇는다(목업 §8 `Black · 사용률 82%`) — 값이 없는 조각은 빼서
  // ` · `가 홀로 남지 않게 한다. 색상 표시는 getDisplayColor()로 통일한다(DM-3).
  const meta = [
    gear.getDisplayColor(),
    gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const weight = formatGearWeightOrNull(gear.getWeight());

  /**
   * 스크린리더는 행을 한 문장으로 읽는다 — 눈으로 훑는 세 줄(브랜드 · 이름 · 메타)과 우측
   * 무게가 같은 순서로 들리게 잇는다. 브랜드는 이름을 여는 라벨이라 쉼표 없이 붙이고,
   * 그 뒤 사실들만 쉼표로 나눈다. 없는 값은 조각째 빼서 빈 쉼표가 들리지 않게 한다.
   */
  const getAccessibilityLabel = (): string =>
    [
      [gear.getDisplayCompany(), gear.getDisplayName()]
        .filter(Boolean)
        .join(' '),
      weight ?? MISSING_WEIGHT_LABEL,
      gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : null,
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
          onPress={handlePressDetail}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel={getAccessibilityLabel()}
        >
          <LiquidMetricRow
            name={gear.getDisplayName()}
            divider={divider}
            // 썸네일이 붙은 행과 없는 행의 키를 같게 묶는다(GearThumbnailView의 행 높이 계약).
            minContentHeight={GEAR_THUMBNAIL_SIZE}
            leading={<GearThumbnailView imageUrl={gear.getImageUrl()} />}
            value={weight}
            {...(gear.getDisplayCompany()
              ? { brand: gear.getDisplayCompany() }
              : {})}
            {...(meta ? { meta } : {})}
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
  // 여백을 주지 않는다. 행 간격은 카드의 margin이 아니라 카드 안 헤어라인이 맡는다 —
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
  // 파괴적 액션은 의미색 — 리디자인해도 바꾸지 않는다.
  deleteAction: {
    backgroundColor: LiquidSemantic.danger,
  },
  actionLabel: {
    fontSize: 12,
    color: Liquid.surface,
  },
});

export default WarehouseGearView;
