import { FC, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { observer } from 'mobx-react-lite';
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
import Svg, { Path } from 'react-native-svg';
import PretendardText from '../PretendardText';
import BrowseSort from '@/model/search/BrowseSort';
import {
  BROWSE_SORT_OPTIONS,
  getBrowseSortName,
} from '@/model/browse/BrowseSortLabel';

// 시트가 화면 밖으로 완전히 내려가는 거리(초기/닫힘 translateY).
const SHEET_OFFSCREEN = 400;
const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;

// 드래그 닫기 임계값 — 아래로 이만큼 끌거나(px) 이 속도 이상이면 닫는다.
const CLOSE_DRAG_THRESHOLD = 120;
const CLOSE_VELOCITY = 0.5;

interface Props {
  sort: BrowseSort;
  onSelect: (sort: BrowseSort) => void;
}

const UpArrowIcon = () => (
  <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
    <Path
      d='M7.5 14L12.5008 9.42L17.5 14'
      stroke='#0A090B'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

const DownArrowIcon = () => (
  <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
    <Path
      d='M7.5 10L12.5008 14.58L17.5 10'
      stroke='#0A090B'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={20} height={20} viewBox='0 0 20 20' fill='none'>
    <Path
      d='M4 10.5L8 14.5L16 5.5'
      stroke='#0A090B'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

const BrowseSortButtonView: FC<Props> = ({ sort, onSelect }) => {
  const [showOptions, setShowOptions] = useState(false);
  const translateY = useSharedValue(SHEET_OFFSCREEN);
  const dim = useSharedValue(0);

  // 시트가 열리면 슬라이드 인 + 딤 페이드 인.
  useEffect(() => {
    if (!showOptions) {
      return;
    }

    translateY.value = SHEET_OFFSCREEN;
    dim.value = 0;
    translateY.value = withTiming(0, { duration: OPEN_DURATION });
    dim.value = withTiming(1, { duration: OPEN_DURATION });
  }, [showOptions, translateY, dim]);

  const handleClosed = () => {
    setShowOptions(false);
  };

  // 닫기: 시트를 화면 밖으로 내리고 딤을 페이드 아웃한 뒤 상태를 정리한다.
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

  const handleOpen = () => {
    setShowOptions(true);
  };

  const handleClose = () => {
    close();
  };

  const handleSelect = (value: BrowseSort) => {
    onSelect(value);
    close();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleOpen}>
        <PretendardText style={styles.buttonText} weight='bold'>
          {getBrowseSortName(sort)}
        </PretendardText>
        {showOptions ? <UpArrowIcon /> : <DownArrowIcon />}
      </TouchableOpacity>

      <Modal
        visible={showOptions}
        transparent={true}
        animationType='none'
        onRequestClose={handleClose}
      >
        <GestureHandlerRootView style={styles.gestureRoot}>
          <Pressable style={styles.overlayRoot} onPress={handleClose}>
            <Animated.View
              style={[styles.overlayDim, dimStyle]}
              pointerEvents='none'
            />
            <Animated.View style={sheetStyle}>
              <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
                <GestureDetector gesture={panGesture}>
                  <View style={styles.handle}>
                    <View style={styles.handleBar} />
                  </View>
                </GestureDetector>

                <PretendardText style={styles.title} weight='bold'>
                  정렬
                </PretendardText>

                <View style={styles.optionList}>
                  {BROWSE_SORT_OPTIONS.map(option => {
                    const isSelected = option.sort === sort;

                    return (
                      <TouchableOpacity
                        key={option.sort}
                        style={styles.optionItem}
                        onPress={() => handleSelect(option.sort)}
                        activeOpacity={0.7}
                      >
                        <PretendardText
                          style={[
                            styles.optionText,
                            { color: isSelected ? '#0A090B' : '#505967' },
                          ]}
                          weight={isSelected ? 'bold' : 'medium'}
                        >
                          {option.name}
                        </PretendardText>
                        {isSelected ? <CheckIcon /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 32,
  },
  button: {
    height: '100%',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  buttonText: {
    fontSize: 14,
    color: 'black',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  gestureRoot: {
    flex: 1,
  },
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: '#0A090B',
    paddingVertical: 16,
  },
  optionList: {
    flexDirection: 'column',
  },
  optionItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default observer(BrowseSortButtonView);
