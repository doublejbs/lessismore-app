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
import GearThumbnailView, {
  GEAR_THUMBNAIL_SIZE,
} from '@/components/gear/GearThumbnailView';
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

// 배낭 상세의 장비 행. 썸네일 규칙은 창고 목록과 같다(BD-1 → WH-1) — 사용자가 올린 본인 사진이
// 있을 때만 좌측에 정사각 썸네일을 두고, 없으면 빈 칸 없이 텍스트 우선 행을 쓴다.
// 이 컴포넌트는 **본인 배낭 상세 전용**이다 — 공유 배낭(BD-7)은 여기를 쓰지 않고
// `components/shared-bag/SharedBagView.tsx`가 자체 행을 그린다. 제3자 표면의 비공개는
// 그쪽 화면과 데이터 레이어(`BagStore.getSharedBag`가 imageUrl을 채우지 않음)가 함께 지킨다
// (DataModel §1 비공개 원칙).
// BD-5의 useless 표기는 로고 마크를 행 우측(지표 컬럼 왼쪽)에 둔다(로고는 장비 이미지가 아님).
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
          {/* BD-5: 썸네일도 행 본문이라 useless일 때 함께 50% 투명해진다(로고 마크는 자체 투명도). */}
          <GearThumbnailView
            imageUrl={gear.getImageUrl()}
            style={[styles.thumbnail, { opacity: bodyOpacity }]}
          />

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
  // BD-1: minHeight를 썸네일 높이에 맞춰 **모든 행에** 걸어, 이미지 있는 행과 없는 행이 섞여도
  // 행 높이가 달라지지 않게 한다(=지표 컬럼의 세로 간격 유지). useless 로고 마크가 이미 같은 44라
  // 이 목록에는 원래 있던 높이다.
  gearItemContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 6,
    minHeight: GEAR_THUMBNAIL_SIZE,
  },
  // 행 gap이 6이라 썸네일 뒤에만 6을 더해 창고 행과 같은 12 간격을 만든다.
  thumbnail: {
    marginRight: 6,
  },
  // BD-5 useless 표기 — 지표 컬럼 왼쪽의 로고 마크로 낸다(본문은 50% 투명도).
  // 좌측 썸네일(있을 때)과 크기가 같아 둘이 함께 보여도 행 높이·정렬이 흔들리지 않는다.
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
