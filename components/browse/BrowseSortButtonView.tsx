import { FC, useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import Svg, { Path } from 'react-native-svg';
import PretendardText from '../PretendardText';
import BrowseSort from '@/model/search/BrowseSort';
import {
  BROWSE_SORT_OPTIONS,
  getBrowseSortName,
} from '@/model/browse/BrowseSortLabel';

const SHEET_SLIDE_DISTANCE = 400;
const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;

// 드래그 닫기 임계값 — 아래로 이만큼 끌거나(px) 이 속도 이상이면 닫는다.
const CLOSE_DRAG_THRESHOLD = 120;
const CLOSE_VELOCITY = 0.5;
// 세로 드래그로 인정할 최소 이동량(가로/작은 움직임과 구분).
const DRAG_ACTIVATE_DISTANCE = 6;

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
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    if (!showOptions) {
      return;
    }

    progress.setValue(0);
    dragY.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [showOptions, progress, dragY]);

  const runClose = () => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;

    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      isClosing.current = false;
      dragY.setValue(0);
      setShowOptions(false);
    });
  };

  // 드래그로 닫기: dragY를 시트 밖까지 애니메이트한 뒤 닫는다(0으로 리셋은 runClose 완료 시점).
  const runCloseByDrag = () => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;

    Animated.timing(dragY, {
      toValue: SHEET_SLIDE_DISTANCE,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      isClosing.current = false;
      progress.setValue(0);
      dragY.setValue(0);
      setShowOptions(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => {
        return (
          gesture.dy > DRAG_ACTIVATE_DISTANCE &&
          gesture.dy > Math.abs(gesture.dx)
        );
      },
      onPanResponderMove: (_event, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > CLOSE_DRAG_THRESHOLD || gesture.vy > CLOSE_VELOCITY) {
          runCloseByDrag();

          return;
        }

        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleOpen = () => {
    setShowOptions(true);
  };

  const handleClose = () => {
    runClose();
  };

  const handleSelect = (value: BrowseSort) => {
    onSelect(value);
    runClose();
  };

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_SLIDE_DISTANCE, 0],
  });

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
        <Pressable style={styles.overlayRoot} onPress={handleClose}>
          <Animated.View
            style={[styles.overlayDim, { opacity: progress }]}
            pointerEvents='none'
          />
          <Animated.View
            style={{
              transform: [{ translateY: Animated.add(sheetTranslateY, dragY) }],
            }}
          >
            <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} {...panResponder.panHandlers}>
              <View style={styles.handleBar} />
            </View>

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
