import { FC, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import LedgerTextTabsSize from '@/components/ledger/LedgerTextTabsSize';
import {
  LedgerColor,
  LedgerLayout,
  LedgerSpace,
  LedgerType,
} from '@/constants/LedgerTokens';

export interface LedgerTextTabItem {
  key: string;
  label: string;
  /** 라벨 뒤에 caption으로 붙는 수. 몇 개가 걸러지는지 알아야 고를 판단이 선다 */
  count?: number | undefined;
  selected: boolean;
  /**
   * 다른 항목들과 **별개 축**인 토글. 선택 표시를 라임 계열 잉크로 갈라, 두 필터가 함께
   * 걸린 상태(카테고리 + 이 토글)를 한 줄에서 구분해 읽게 한다.
   */
  accent?: boolean | undefined;
  accessibilityLabel?: string | undefined;
}

interface Props {
  items: LedgerTextTabItem[];
  onSelect: (key: string) => void;
  size?: LedgerTextTabsSize | undefined;
  /**
   * 스크롤 안으로 들일 항목의 키. 선택이 승계돼 들어온 경우(다른 화면에서 카테고리를 좁혀
   * 진입) 그 항목이 스크롤 밖에 있으면 **필터가 걸린 줄 모른 채** 목록이 적게 나온 것처럼
   * 읽힌다.
   */
  alignKey?: string | undefined;
  /** 줄을 화면 좌우로 블리드시키는 음수 마진 등 — 배치는 호출부가 정한다 */
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

// 선택 항목을 스크롤 안으로 들일 때 가장자리에 남기는 여백 — 딱 붙으면 잘린 것처럼 보인다.
const EDGE_PADDING = LedgerSpace.lg;

// 선택 밑줄 두께. 비선택 항목도 투명으로 같은 두께를 들어 높이가 갈리지 않는다.
const UNDERLINE_HEIGHT = 2;

/**
 * Ledger 텍스트 탭. 알약 칩을 대체한다.
 *
 * 칩은 항목마다 면과 테두리를 만들어 필터 줄 하나가 카드 더미처럼 보였다. 원장에서 고르는
 * 일은 **글자에 밑줄을 옮기는 것**이다 — 선택은 잉크 + 2px 밑줄, 비선택은 한 급 낮춘 잉크에
 * 밑줄 없음. 면이 없으므로 줄이 목록의 일부로 읽힌다.
 *
 * 터치 타깃은 항목 높이(`rowMin` 44)로 확보한다 — `hitSlop`은 Android에서 부모 경계를
 * 넘지 못해 세로로 넓혀도 전달되지 않는다. 가로는 이웃과 겹치므로 넓히지 않는다.
 */
const LedgerTextTabs: FC<Props> = ({
  items,
  onSelect,
  size = LedgerTextTabsSize.Md,
  alignKey,
  style,
  contentContainerStyle,
}) => {
  const isSmall = size === LedgerTextTabsSize.Sm;

  /**
   * 측정은 `onLayout`으로 모은다. `measureLayout`은 마운트 직후 타이밍을 타는데, 여기서
   * 필요한 건 레이아웃이 확정된 시점의 좌표뿐이라 콜백으로 받는 편이 확실하다.
   */
  const scrollRef = useRef<ScrollView>(null);
  const layoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const viewportWidthRef = useRef(0);
  const offsetRef = useRef(0);
  // 첫 정렬은 애니메이션 없이 — 진입하자마자 줄이 흐르면 사용자가 건드린 것처럼 보인다.
  const hasAlignedRef = useRef(false);

  const ensureVisible = useCallback((key: string | undefined) => {
    if (!key) {
      return;
    }

    const layout = layoutsRef.current[key];
    const viewport = viewportWidthRef.current;

    if (!layout || viewport === 0) {
      return;
    }

    const offset = offsetRef.current;
    const left = layout.x;
    const right = layout.x + layout.width;
    const animated = hasAlignedRef.current;

    // 이미 보이는 항목은 건드리지 않는다 — 탭할 때마다 줄이 흔들리면 거슬린다.
    if (left < offset + EDGE_PADDING) {
      scrollRef.current?.scrollTo({
        x: Math.max(0, left - EDGE_PADDING),
        animated,
      });
    } else if (right > offset + viewport - EDGE_PADDING) {
      scrollRef.current?.scrollTo({
        x: right - viewport + EDGE_PADDING,
        animated,
      });
    }

    hasAlignedRef.current = true;
  }, []);

  useEffect(() => {
    ensureVisible(alignKey);
  }, [alignKey, ensureVisible]);

  const handleItemLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;

    layoutsRef.current[key] = { x, width };

    // 마운트 직후에는 위 effect가 좌표보다 먼저 돌기 때문에 여기서 한 번 더 맞춘다.
    if (key === alignKey) {
      ensureVisible(key);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.x;
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
    ensureVisible(alignKey);
  };

  const getLabelColor = (item: LedgerTextTabItem): string => {
    if (!item.selected) {
      return LedgerColor.inkTertiary;
    }

    return LedgerColor.ink;
  };

  /**
   * 선택 표시색. 별개 축인 항목만 라임 계열 잉크로 갈라 둔다.
   *
   * 원색 라임(`accent`)을 2px 선으로 흰 면에 그으면 대비가 1.4:1 수준이라 보이지 않는다 —
   * 흰 면 위 라임은 잉크(`accentInk`)로 쓴다.
   */
  const getUnderlineColor = (item: LedgerTextTabItem): string => {
    if (!item.selected) {
      return 'transparent';
    }

    return item.accent ? LedgerColor.accentInk : LedgerColor.ink;
  };

  const getCountColor = (item: LedgerTextTabItem): string => {
    if (!item.selected) {
      return LedgerColor.inkQuiet;
    }

    return item.accent ? LedgerColor.accentInk : LedgerColor.inkTertiary;
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      onLayout={handleLayout}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      accessibilityRole='tablist'
    >
      {items.map(item => (
        <TouchableOpacity
          key={item.key}
          style={styles.item}
          onPress={() => onSelect(item.key)}
          onLayout={handleItemLayout(item.key)}
          activeOpacity={0.7}
          accessibilityRole='tab'
          accessibilityState={{ selected: item.selected }}
          {...(item.accessibilityLabel
            ? { accessibilityLabel: item.accessibilityLabel }
            : {})}
        >
          <View style={styles.labelBox}>
            <PretendardText
              weight='medium'
              style={[
                isSmall ? styles.labelSm : styles.label,
                { color: getLabelColor(item) },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </PretendardText>
            {item.count !== undefined ? (
              <PretendardText
                weight='medium'
                style={[styles.count, { color: getCountColor(item) }]}
              >
                {item.count}
              </PretendardText>
            ) : null}
          </View>
          <View
            style={[
              styles.underline,
              { backgroundColor: getUnderlineColor(item) },
            ]}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: LedgerSpace.lg,
  },
  /**
   * 높이 44로 터치 타깃을 확보하고, 밑줄은 항목 **밑단**에 붙인다 — 아래 구역 경계선과
   * 만나 탭이 그 선에 앉은 것처럼 읽힌다.
   */
  item: {
    minHeight: LedgerLayout.rowMin,
    justifyContent: 'flex-end',
  },
  labelBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LedgerSpace.xs,
  },
  label: {
    fontSize: LedgerType.label.fontSize,
    lineHeight: LedgerType.label.lineHeight,
  },
  labelSm: {
    fontSize: LedgerType.caption.fontSize,
    lineHeight: LedgerType.caption.lineHeight,
  },
  count: {
    fontSize: LedgerType.caption.fontSize,
    lineHeight: LedgerType.caption.lineHeight,
  },
  underline: {
    height: UNDERLINE_HEIGHT,
  },
});

export default LedgerTextTabs;
