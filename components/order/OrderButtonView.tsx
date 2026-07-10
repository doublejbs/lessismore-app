import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import Order from '@/model/order/Order';
import OrderOption from '@/model/order/OrderOption';

interface Props {
  order: Order;
  onSelectOption?: (option: OrderOption) => void;
}

const SHEET_OFFSET = 500;

const UpArrowIcon = () => (
  <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
    <Path
      d='M7.5 14L12.5008 9.42L17.5 14'
      stroke={Color.textPrimary}
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
      stroke={Color.textPrimary}
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

const OrderButtonView = ({ order, onSelectOption }: Props) => {
  const insets = useSafeAreaInsets();
  const showOrderOptions = order.isShowOrderOptions();
  const selectedOrderName = order.getSelectedOrderName();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SHEET_OFFSET)).current;

  useEffect(() => {
    if (showOrderOptions) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(SHEET_OFFSET);
    }
  }, [showOrderOptions, fadeAnim, slideAnim]);

  const handleSortClick = () => {
    order.toggleOrderOptions();
  };

  const handleSortOptionClick = (orderOption: OrderOption) => {
    onSelectOption?.(orderOption);
    order.setOrderOption(orderOption);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleSortClick}
        hitSlop={8}
        accessibilityRole='button'
        accessibilityLabel={`정렬: ${selectedOrderName}`}
      >
        <PretendardText weight='semibold' style={styles.buttonText}>
          {selectedOrderName}
        </PretendardText>
        {showOrderOptions ? <UpArrowIcon /> : <DownArrowIcon />}
      </TouchableOpacity>

      <Modal
        visible={showOrderOptions}
        transparent
        animationType='none'
        onRequestClose={handleSortClick}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleSortClick} />
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + 12,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <PretendardText weight='bold' style={styles.sheetTitle}>
              정렬
            </PretendardText>
            {order.mapOrderOptions(option => {
              const selected = option.isSelected();
              return (
                <TouchableOpacity
                  key={option.getOrder()}
                  style={styles.optionRow}
                  onPress={() => handleSortOptionClick(option)}
                  activeOpacity={0.7}
                  accessibilityRole='button'
                >
                  <PretendardText
                    weight={selected ? 'semibold' : 'regular'}
                    style={[
                      styles.optionText,
                      { color: selected ? Color.textPrimary : Color.textSecondary },
                    ]}
                  >
                    {option.getName()}
                  </PretendardText>
                  {selected && (
                    <Ionicons
                      name='checkmark'
                      size={20}
                      color={Color.textPrimary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </Animated.View>
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
  },
  buttonText: {
    fontSize: 14,
    color: Color.textPrimary,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sheetTitle: {
    fontSize: 18,
    color: Color.textPrimary,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
  },
});

export default observer(OrderButtonView);
