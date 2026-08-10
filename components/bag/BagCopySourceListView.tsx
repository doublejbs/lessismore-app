import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import LoadingView from '@/components/ui/LoadingView';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidMotion,
  LiquidType,
} from '@/constants/DesignTokens';
import BagItem from '@/model/bag/BagItem';

// 하단 여백은 마지막 행의 세로 패딩과 합쳐져 실효 여백이 insets.bottom이 되도록 그만큼 빼서 준다.
const ROW_VERTICAL_PADDING = 16;
const MIN_BOTTOM_PADDING = 12;
// 로딩·빈 상태가 들어가도 시트가 비어 보이지 않을 최소 높이.
const STATE_MIN_HEIGHT = 120;

const getBottomPadding = (safeAreaBottom: number) =>
  Math.max(safeAreaBottom - ROW_VERTICAL_PADDING, MIN_BOTTOM_PADDING);

interface Props {
  // 복사 원본 후보 목록(BagStore.getList()). 조회 실패도 빈 배열로 들어온다.
  bags: BagItem[];
  // 목록 조회 진행 중 — 빈 시트 대신 로딩 인디케이터를 표시한다(BAG-5).
  isLoading: boolean;
  // 행 탭 — 해당 배낭을 원본으로 복사 폼을 연다.
  onSelect: (bagItem: BagItem) => void;
}

// 원본 배낭 선택 시트(BAG-5)의 콘텐츠 — 고정 제목 + 행 + 로딩/빈 상태.
// 현재 구조는 이 ScrollView를 화면 루트로 두므로 다른 View로 감싸지 않는다
// — 근거와 미확정 범위는 app/bag-copy-source.tsx 주석 참고.
const BagCopySourceListView: FC<Props> = ({ bags, isLoading, onSelect }) => {
  const insets = useSafeAreaInsets();

  const renderRows = () => {
    if (isLoading) {
      return (
        <View style={styles.stateWrap}>
          <LoadingView duration={1000} />
        </View>
      );
    }

    if (bags.length === 0) {
      // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions).
      return (
        <View style={styles.stateWrap}>
          <PretendardText style={styles.emptyFact} weight='semibold'>
            복사할 배낭이 없어요
          </PretendardText>
          <PretendardText style={styles.emptyNext}>
            먼저 배낭을 하나 만들어요
          </PretendardText>
        </View>
      );
    }

    return bags.map((bagItem, index) => {
      const date = bagItem.getDate();

      const handlePress = () => {
        onSelect(bagItem);
      };

      return (
        <TouchableOpacity
          key={bagItem.getID()}
          style={[styles.row, index === 0 && styles.rowFirst]}
          activeOpacity={LiquidMotion.pressOpacity}
          onPress={handlePress}
          accessibilityRole='button'
          accessibilityLabel={`${bagItem.getName()}, ${date}, ${bagItem.getWeight()}kg`}
        >
          <View style={styles.rowText}>
            <PretendardText weight='semibold' style={styles.name}>
              {bagItem.getName()}
            </PretendardText>
            <PretendardText style={styles.date}>{date}</PretendardText>
          </View>
          {/* 값과 단위를 한 덩어리로 쓴다 — 숫자와 라틴 단위뿐이라 콘덴스드가 안전하다. */}
          <PretendardText style={styles.weight}>
            {`${bagItem.getWeight()}kg`}
          </PretendardText>
          <Ionicons name='chevron-forward' size={18} color={Liquid.inkSubtle} />
        </TouchableOpacity>
      );
    });
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: getBottomPadding(insets.bottom) },
      ]}
      stickyHeaderIndices={[0]}
    >
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          복사할 배낭 선택
        </PretendardText>
      </View>

      {renderRows()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    // 시트는 종이 면이다 — 고를 목록만 담아 카드를 겹치지 않고 헤어라인으로 행을 나눈다.
    backgroundColor: Liquid.surface,
  },
  scrollContent: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 8,
  },
  header: {
    // 고정 헤더 — 행이 아래로 지나가도 가려지지 않게 불투명 배경을 준다.
    backgroundColor: Liquid.surface,
    paddingVertical: 12,
  },
  // 시트 제목은 화면 대상이라 title3 — 행 제목(15)과 위계가 갈린다(sort-sheet 선례).
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  stateWrap: {
    minHeight: STATE_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyFact: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyNext: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: LiquidLayout.touchMin,
    paddingVertical: ROW_VERTICAL_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Liquid.hairline,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  date: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  weight: {
    flexShrink: 0,
    fontFamily: LiquidFont.condensed,
    fontSize: 17,
    color: Liquid.ink,
  },
});

export default BagCopySourceListView;
