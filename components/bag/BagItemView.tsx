import { FC, useRef } from 'react';
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
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Ionicons } from '@expo/vector-icons';
import { Acg, AcgFontSize, AcgRow } from '@/constants/DesignTokens';

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
        <IconSymbol name='doc.on.doc' size={20} color={Acg.paper} />
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
        <IconSymbol name='trash.fill' size={20} color={Acg.paper} />
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
  /**
   * 위 행과 가르는 헤어라인을 그릴지. 구간(여행 중/예정/지난) **첫 행에는 그리지 않는다** —
   * 바로 위가 구간 제목이라 선이 제목에 붙어 밑줄처럼 읽힌다.
   */
  divided?: boolean;
}

const BagItemView: FC<Props> = ({ bagItem, bag, divided = false }) => {
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
        style={[styles.container, divided && styles.divided]}
        onPress={handleClick}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={rowAccessibilityLabel}
      >
        <View style={styles.rowText}>
          <PretendardText weight='medium' style={styles.name} numberOfLines={2}>
            {bagItem.getName()}
          </PretendardText>

          {/*
            레퍼런스처럼 값을 한 줄에 `·`로 묶는다 — 무게 · 기간 · 패킹.
            무게가 맨 앞이라 행마다 같은 자리에서 비교되고, 숫자만 중첩 Text로 콘덴스드다.
            패킹은 칩을 없애고 이 줄의 마지막 조각으로 넣는다: 칩은 면·테두리를 하나 더
            만들어, 면 없이 헤어라인으로만 가르는 이 목록에서 유일한 예외가 된다.
          */}
          <PretendardText style={styles.meta} numberOfLines={1}>
            <AcgDisplayText style={styles.metaNumber}>
              {`${bagItem.getWeight()}kg`}
            </AcgDisplayText>
            {` · ${date}`}
            {bagItem.hasPackingRecord()
              ? bagItem.isPackingComplete()
                ? ' · 패킹 완료'
                : ` · 패킹 ${bagItem.getPackingPercent()}%`
              : ''}
          </PretendardText>
        </View>

        <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  /**
   * 배낭 행(레퍼런스 목록 문법 2026-08-11). 종이 면 + 그림자를 걷어내고 순백 지면에
   * 콘텐츠만 놓는다 — 지면이 순백이 되면서 흰 면은 보이지 않고 그림자만 남았다.
   */
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    // 스와이프 액션이 행 뒤에서 드러나므로 행에 지면색을 깔아 둔다(투명이면 액션이 비친다).
    backgroundColor: Acg.paper,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 24,
    color: Acg.ink,
  },
  // 메타는 회색이 아니라 잉크다(레퍼런스) — 무게·기간·패킹은 장식이 아니라 정보다.
  meta: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.ink,
  },
  // 메타 줄 안의 숫자 조각 — 크기는 상속하고 서체만 콘덴스드로 바꾼다.
  metaNumber: {
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.ink,
  },
  // 행이 면 없이 붙어 있으므로 액션 패널도 행 높이에 그대로 맞춘다(카드 시절의 하단 여백 없음).
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
    backgroundColor: Acg.ink,
  },
  deleteAction: {
    backgroundColor: DELETE_RED,
  },
  actionLabel: {
    fontSize: AcgFontSize.meta,
    color: Acg.paper,
  },
});

export default BagItemView;
