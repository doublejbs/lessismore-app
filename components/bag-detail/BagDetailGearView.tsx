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
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import GearThumbnailView, {
  GEAR_THUMBNAIL_SIZE,
} from '@/components/gear/GearThumbnailView';
import { Acg, AcgFontSize, AcgRow } from '@/constants/DesignTokens';

// 삭제 스와이프 액션 배경 — 파괴적 액션 시맨틱 색(DesignTokens 예외, CLAUDE.md 참고).
const DELETE_RED = '#FF3B30';

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
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={deleteLabel}
      >
        <Ionicons name='trash' size={20} color={Acg.paper} />
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
  // 위 행과 가르는 헤어라인을 그릴지. 카테고리 첫 행에는 그리지 않는다(제목 밑줄처럼 읽힌다).
  divided?: boolean;
}

// 배낭 상세의 장비 행. 썸네일 규칙은 창고 목록과 같다(BD-1 → WH-1) — 사용자가 올린 본인 사진이
// 있을 때만 좌측에 정사각 썸네일을 두고, 없으면 빈 칸 없이 텍스트 우선 행을 쓴다.
// 이 컴포넌트는 **본인 배낭 상세 전용**이다 — 공유 배낭(BD-7)은 여기를 쓰지 않고
// `components/shared-bag/SharedBagView.tsx`가 자체 행을 그린다. 제3자 표면의 비공개는
// 그쪽 화면과 데이터 레이어(`BagStore.getSharedBag`가 imageUrl을 채우지 않음)가 함께 지킨다
// (DataModel §1 비공개 원칙).
// BD-5의 useless 표기는 로고 마크를 행 우측(지표 컬럼 왼쪽)에 둔다(로고는 장비 이미지가 아님).
const BagDetailGearView: FC<Props> = ({ gear, bagDetail, divided = false }) => {
  const isUseless = bagDetail.isUseless(gear);
  // BD-5: useless 장비는 행 본문(정체·지표 컬럼)을 50% 투명으로 낮춘다. 로고 마크는 자체 투명도를 갖는다.
  const bodyOpacity = isUseless ? 0.5 : 1;
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

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      {/* 불투명 배경 — 스와이프 전환 중 뒤 액션색이 행 밑으로 비치지 않게 한다(BagItemView와 동일). */}
      <View style={[styles.rowBackground, divided && styles.divided]}>
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

          <View style={[styles.rowText, { opacity: bodyOpacity }]}>
            <PretendardText
              style={styles.name}
              weight='medium'
              numberOfLines={2}
            >
              {gear.getDisplayName()}
            </PretendardText>

            {/*
              레퍼런스 목록 문법 — 값을 한 줄에 `·`로 묶는다: 무게 · 브랜드 · 색상 · 사용률.
              무게가 맨 앞이라 행마다 같은 자리에서 비교되고, 숫자만 중첩 Text로 콘덴스드다.
              값이 없는 조각은 붙이지 않는다(빈 텍스트를 두면 `·`만 남는다).
              사용률도 배지 면을 걷고 이 줄의 조각으로 넣는다 — 면 없이 헤어라인으로만 가르는
              목록에서 배지는 유일한 예외 면이 된다.
            */}
            <PretendardText style={styles.meta} numberOfLines={1}>
              <AcgDisplayText style={styles.metaNumber}>
                {`${gear.getWeight()}g`}
              </AcgDisplayText>
              {[
                gear.getDisplayCompany(),
                gear.getDisplayColor(),
                gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : '',
              ]
                .filter(Boolean)
                .map(part => ` · ${part}`)
                .join('')}
            </PretendardText>
          </View>

          {/* BD-5: useless 로고 마크는 셰브론 왼쪽에 둔다 — 행의 오른쪽 끝은 이동 표시의 자리다. */}
          {isUseless && (
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.uselessMark}
            />
          )}

          <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  /**
   * 레퍼런스 목록 행(2026-08-11) — 면·그림자 없이 순백 지면에 놓고 헤어라인으로만 가른다.
   * 지면색을 깔아 두는 이유는 표현이 아니라 기능이다: 스와이프 전환 중 뒤 액션색이 행 밑으로
   * 비치지 않아야 한다.
   */
  rowBackground: {
    backgroundColor: Acg.paper,
    paddingVertical: AcgRow.paddingVertical,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  gearItemContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 12,
    // 썸네일이 있는 행과 없는 행이 섞여도 높이가 달라지지 않게 최소 높이를 걸어 둔다.
    minHeight: GEAR_THUMBNAIL_SIZE,
  },
  // 썸네일은 행 gap(12)이 간격을 맡으므로 자체 여백을 두지 않는다.
  thumbnail: {},
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 22,
    color: Acg.ink,
  },
  // 메타는 회색이 아니라 잉크다(레퍼런스) — 무게·브랜드·사용률은 장식이 아니라 정보다.
  meta: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 19,
    color: Acg.ink,
  },
  metaNumber: {
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.ink,
  },
  // BD-5 useless 표기 — 본문은 50% 투명, 마크는 자체 투명도.
  uselessMark: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    opacity: 0.5,
    transform: [{ rotate: '-10.78deg' }],
  },
  // 여백을 주지 않는다 — 행이 헤어라인으로 붙어 있어 패널도 행 높이에 그대로 맞아야 한다.
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
    fontSize: AcgFontSize.meta,
    color: Acg.paper,
  },
});

export default observer(BagDetailGearView);
