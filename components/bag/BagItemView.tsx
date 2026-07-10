import React, { FC, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import app from '@/model/app/App';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Color, Radius } from '@/constants/DesignTokens';

// 삭제 스와이프 액션 배경 — 파괴적 액션 시맨틱 색(DesignTokens 예외, CLAUDE.md 참고).
const DELETE_RED = '#FF3B30';

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
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='배낭 복사'
      >
        <IconSymbol name='doc.on.doc' size={20} color={Color.background} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          복사
        </PretendardText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={onDelete}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='배낭 삭제'
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
  bagItem: BagItem;
  bag: Bag;
}

const BagItemView: FC<Props> = ({ bagItem, bag }) => {
  const date = bagItem.getDate();
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);

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

  const rowAccessibilityLabel = `${bagItem.getName()}, ${date}, ${bagItem.getWeight()}kg`;

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={handleClick}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={rowAccessibilityLabel}
      >
        <View style={styles.header}>
          <View style={styles.infoContainer}>
            <View style={styles.titleContainer}>
              <PretendardText weight='bold' style={styles.name}>
                {bagItem.getName()}
              </PretendardText>
              <PretendardText style={styles.date}>{date}</PretendardText>
            </View>
            <View style={styles.weightContainer}>
              <PretendardText weight='bold' style={styles.weight}>
                {bagItem.getWeight()}kg
              </PretendardText>
              {bagItem.hasPackingRecord() && (
                <View
                  style={
                    bagItem.isPackingComplete()
                      ? styles.packingCompleteChip
                      : styles.packingProgressChip
                  }
                >
                  <PretendardText
                    style={
                      bagItem.isPackingComplete()
                        ? styles.packingCompleteChipText
                        : styles.packingProgressChipText
                    }
                    weight='medium'
                  >
                    {bagItem.isPackingComplete()
                      ? '패킹 완료'
                      : `패킹 ${bagItem.getPackingPercent()}%`}
                  </PretendardText>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'column',
    paddingVertical: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Color.divider,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  titleContainer: {
    flexDirection: 'column',
    gap: 9,
  },
  name: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  date: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  weight: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packingCompleteChip: {
    backgroundColor: Color.textPrimary,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  packingCompleteChipText: {
    fontSize: 12,
    color: Color.background,
  },
  packingProgressChip: {
    backgroundColor: Color.background,
    borderWidth: 1,
    borderColor: Color.textPrimary,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  packingProgressChipText: {
    fontSize: 12,
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
  copyAction: {
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

export default BagItemView;
