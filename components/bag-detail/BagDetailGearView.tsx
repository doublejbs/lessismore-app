import React, { FC, useRef } from 'react';
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
import BagDetailImageView from './BagDetailImageView';
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

const BagDetailGearView: FC<Props> = ({ gear, bagDetail }) => {
  const imageUrl = gear.getImageUrl();
  const isUseless = bagDetail.isUseless(gear);
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
          accessibilityLabel={`${gear.getDisplayName()}, ${gear.getWeight()}g`}
        >
          <View style={styles.imageContainer}>
            <BagDetailImageView imageUrl={imageUrl} shadow={isUseless} />
            {isUseless && (
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.uselessOverlay}
              />
            )}
          </View>

          <View
            style={[styles.contentContainer, { opacity: isUseless ? 0.5 : 1 }]}
          >
            <View style={styles.gearInfo}>
              <View style={styles.companyRow}>
                <PretendardText style={styles.companyText}>
                  {gear.getCompany()}
                </PretendardText>
                {gear.hasUsedRate() && (
                  <View style={styles.usageRateBadge}>
                    <PretendardText style={styles.usageRateText}>
                      사용률 {gear.getUsedRate()}%
                    </PretendardText>
                  </View>
                )}
              </View>
              <PretendardText
                style={styles.nameText}
                weight='bold'
                numberOfLines={1}
              >
                {gear.getDisplayName()}
              </PretendardText>
              <PretendardText style={styles.colorText}>
                {gear.getColor()}
              </PretendardText>
              <PretendardText style={styles.weightText} weight='bold'>
                {gear.getWeight()}g
              </PretendardText>
            </View>
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
    gap: 6,
  },
  imageContainer: {
    width: 80,
    height: 80,
    minWidth: 80,
    backgroundColor: Color.thumbBg,
    borderRadius: Radius.listThumb,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uselessOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    transform: [{ rotate: '-10.78deg' }],
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  gearInfo: {
    flex: 1,
    gap: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyText: {
    fontSize: 12,
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
