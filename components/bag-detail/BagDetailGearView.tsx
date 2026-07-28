import { FC, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import BagDetail from '@/model/bag-detail/BagDetail';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

// 삭제 스와이프 액션 배경 — 파괴적 액션 시맨틱 색(DesignTokens 예외, CLAUDE.md 참고).
const DELETE_RED = '#FF3B30';

// 액션 버튼 1개 너비. 전체 액션 영역 = ACTION_WIDTH * 2.
const ACTION_WIDTH = 72;
const ACTIONS_TOTAL_WIDTH = ACTION_WIDTH * 2;

interface RightActionsProps {
  // ReanimatedSwipeable가 넘겨주는 드래그 변위(열릴수록 음수, 닫히면 0).
  drag: SharedValue<number>;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}

// 드래그 변위에 맞춰 오른쪽에서 슬라이드 인. 닫힘(drag=0) 상태에선 화면 밖으로 밀려 숨겨져
// 살짝 드래그했을 때 액션이 통째로 깜빡이는 문제를 방지한다.
const RightActions: FC<RightActionsProps> = ({
  drag,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTIONS_TOTAL_WIDTH }],
  }));

  return (
    <Reanimated.View style={[styles.actionsContainer, animatedStyle]}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editAction]}
        onPress={onEdit}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={editLabel}
      >
        <Ionicons name='create-outline' size={20} color={Color.background} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          수정
        </PretendardText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={onDelete}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={deleteLabel}
      >
        <Ionicons name='trash' size={20} color={Color.background} />
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
}

// 배낭 상세의 장비 행. 장비 썸네일은 표시하지 않는다(DataModel §1 장비 이미지 미제공 원칙).
// BD-5의 useless 표기는 유지하되, 썸네일이 사라져 로고 마크를 행 우측에 둔다(로고는 장비 이미지가 아님).
const BagDetailGearView: FC<Props> = ({ gear, bagDetail }) => {
  const isUseless = bagDetail.isUseless(gear);
  // BD-5: useless 장비는 행 본문(정체·지표 컬럼)을 50% 투명으로 낮춘다. 로고 마크는 자체 투명도를 갖는다.
  const bodyOpacity = isUseless ? 0.5 : 1;
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handlePressGear = () => {
    app.getAnalyticsManager()?.logClick('gear_item', { from: 'bag_detail' });
    router.push(`/gear-detail/${gear.getId()}`);
  };

  const handlePressEdit = () => {
    swipeableRef.current?.close();
    bagDetail.goToEditGear(gear);
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
      editLabel={`${gear.getDisplayName()} 수정`}
      deleteLabel={`${gear.getDisplayName()} 삭제`}
      onEdit={handlePressEdit}
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
      {/* 불투명 배경 — 스와이프 전환 중 뒤 액션색이 행 밑으로 비치지 않게 한다(BagItemView와 동일). */}
      <View style={styles.rowBackground}>
        <TouchableOpacity
          style={styles.gearItemContainer}
          onPress={handlePressGear}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={
            isUseless
              ? `${gear.getDisplayName()}, ${gear.getWeight()}g, 사용 안 함`
              : `${gear.getDisplayName()}, ${gear.getWeight()}g`
          }
        >
          <View style={[styles.identityColumn, { opacity: bodyOpacity }]}>
            <PretendardText
              style={styles.companyText}
              weight='bold'
              numberOfLines={1}
            >
              {gear.getDisplayCompany()}
            </PretendardText>
            <PretendardText
              style={styles.nameText}
              weight='bold'
              numberOfLines={1}
            >
              {gear.getDisplayName()}
            </PretendardText>
            {gear.getColor() ? (
              <PretendardText style={styles.colorText} numberOfLines={1}>
                {gear.getColor()}
              </PretendardText>
            ) : null}
          </View>

          {/* BD-5: useless 로고 마크는 지표 컬럼의 **왼쪽**에 둬 무게 컬럼의 세로 정렬을 유지한다. */}
          {isUseless && (
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.uselessMark}
            />
          )}

          <View style={[styles.metricsColumn, { opacity: bodyOpacity }]}>
            {gear.hasUsedRate() && (
              <View style={styles.usageRateBadge}>
                <PretendardText style={styles.usageRateText}>
                  사용률 {gear.getUsedRate()}%
                </PretendardText>
              </View>
            )}
            <PretendardText style={styles.weightText} weight='bold'>
              {gear.getWeight()}g
            </PretendardText>
          </View>
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  rowBackground: {
    backgroundColor: Color.background,
  },
  gearItemContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  // BD-5 useless 표기 — 썸네일이 사라져 행 우측의 로고 마크로 낸다(본문은 50% 투명도).
  uselessMark: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
    opacity: 0.5,
    transform: [{ rotate: '-10.78deg' }],
  },
  // 좌 정체 컬럼 — 브랜드·이름·색상.
  identityColumn: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  // 우 지표 컬럼 — 사용률 배지(위) + 무게(아래).
  metricsColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  // 브랜드는 이름(nameText)과 동일한 타이포로 표시한다.
  companyText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  usageRateBadge: {
    borderRadius: Radius.card,
    backgroundColor: Color.chipInactiveBg,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  usageRateText: {
    fontSize: 10,
    color: Color.textPrimary,
  },
  nameText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  colorText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  weightText: {
    fontSize: 14,
    color: Color.textPrimary,
    textAlign: 'right',
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
  editAction: {
    backgroundColor: Color.chipActiveBg,
  },
  deleteAction: {
    backgroundColor: DELETE_RED,
  },
  actionLabel: {
    fontSize: 12,
    color: Color.background,
  },
});

export default observer(BagDetailGearView);
