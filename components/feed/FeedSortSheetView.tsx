import { FC, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Feed from '@/model/feed/Feed';
import {
  FeedSort,
  FEED_SORT_OPTIONS,
  toFeedSort,
  fromFeedSort,
  getFeedSortLabel,
} from '@/model/feed/FeedSort';
import { Color, Radius } from '@/constants/DesignTokens';
import PretendardText from '@/components/PretendardText';
import app from '@/model/app/App';

const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;

// 시트가 화면 밖으로 완전히 내려가는 거리(내용 높이보다 충분히 큰 상수).
const SHEET_OFFSCREEN = 700;

// 드래그 닫기 임계값 — 아래로 이만큼 끌거나(px) 이 속도 이상이면 닫는다.
const CLOSE_DRAG_THRESHOLD = 100;
const CLOSE_VELOCITY = 0.5;

interface Props {
  feed: Feed;
  visible: boolean;
  onClose: () => void;
}

// FD-3: 정렬 전용 소형 바텀시트. 컨트롤 행 우측 `정렬` 드롭다운으로 연다.
// 항목 탭 = 즉시 적용 후 닫힘(스테이징 없음). 브랜드 시트와 동일한 슬라이드/딤/드래그 패턴을 쓰되 내용 높이로 감싼다.
const FeedSortSheetView: FC<Props> = ({ feed, visible, onClose }) => {
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(SHEET_OFFSCREEN);
  const dim = useSharedValue(0);

  const currentSort = toFeedSort(feed.getSort());

  useEffect(() => {
    if (!visible) {
      return;
    }

    translateY.value = SHEET_OFFSCREEN;
    dim.value = 0;
    translateY.value = withTiming(0, { duration: OPEN_DURATION });
    dim.value = withTiming(1, { duration: OPEN_DURATION });
  }, [visible, translateY, dim]);

  const handleClosed = () => {
    onClose();
  };

  const close = () => {
    dim.value = withTiming(0, { duration: CLOSE_DURATION });
    translateY.value = withTiming(
      SHEET_OFFSCREEN,
      { duration: CLOSE_DURATION },
      finished => {
        if (finished) {
          runOnJS(handleClosed)();
        }
      }
    );
  };

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (
        event.translationY > CLOSE_DRAG_THRESHOLD ||
        event.velocityY > CLOSE_VELOCITY
      ) {
        dim.value = withTiming(0, { duration: CLOSE_DURATION });
        translateY.value = withTiming(
          SHEET_OFFSCREEN,
          { duration: CLOSE_DURATION },
          finished => {
            if (finished) {
              runOnJS(handleClosed)();
            }
          }
        );

        return;
      }

      translateY.value = withSpring(0);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dimStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
  }));

  // FD-3: 항목 탭 = 정렬 즉시 적용(공통 click_feed_filter_apply) 후 닫힘.
  const handleSelect = (value: FeedSort) => {
    app.getAnalyticsManager()?.logClick('feed_filter_apply', {
      category: feed.getFilterCategory() ?? 'all',
      brand_count: feed.getFilterBrands().length,
      sort: getFeedSortLabel(value),
    });
    feed.selectSort(fromFeedSort(value));
    close();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType='none'
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Pressable style={styles.overlayRoot} onPress={close}>
          <Animated.View
            style={[styles.overlayDim, dimStyle]}
            pointerEvents='none'
          />
          <Animated.View style={sheetStyle}>
            <Pressable
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
              onPress={e => e.stopPropagation()}
            >
              <GestureDetector gesture={panGesture}>
                <View style={styles.handle}>
                  <View style={styles.handleBar} />
                </View>
              </GestureDetector>

              <View style={styles.header}>
                <PretendardText style={styles.title} weight='bold'>
                  정렬
                </PretendardText>
              </View>

              {FEED_SORT_OPTIONS.map(option => {
                const selected = currentSort === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.row}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    <PretendardText
                      style={[styles.rowText, selected && styles.rowTextSelected]}
                      weight={selected ? 'semibold' : 'regular'}
                    >
                      {option.label}
                    </PretendardText>
                    {selected ? (
                      <Ionicons
                        name='checkmark'
                        size={20}
                        color={Color.textPrimary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </Animated.View>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Color.overlay,
  },
  sheet: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: 20,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },
  header: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: '#0A090B',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 16,
    lineHeight: 20,
    color: Color.textSecondary,
  },
  rowTextSelected: {
    color: Color.textPrimary,
  },
});

export default observer(FeedSortSheetView);
