import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import Svg, { Path } from 'react-native-svg';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import Order from '@/model/order/Order';
import OrderOption from '@/model/order/OrderOption';

interface Props {
  order: Order;
  onSelectOption?: (option: OrderOption) => void;
}

interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  const { width: screenWidth } = useWindowDimensions();
  const buttonRef = useRef<View>(null);
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition | null>(
    null
  );
  const showOrderOptions = order.isShowOrderOptions();
  const selectedOrderName = order.getSelectedOrderName();

  const handleLayout = () => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, width, height) => {
        setButtonPosition({ x, y, width, height });
      });
    }
  };

  const handleSortClick = () => {
    order.toggleOrderOptions();
  };

  const handleSortOptionClick = (orderOption: OrderOption) => {
    onSelectOption?.(orderOption);
    order.setOrderOption(orderOption);
  };

  return (
    <View style={styles.container} ref={buttonRef} onLayout={handleLayout}>
      <TouchableOpacity style={styles.button} onPress={handleSortClick}>
        <PretendardText weight='semibold' style={styles.buttonText}>
          {selectedOrderName}
        </PretendardText>
        {showOrderOptions ? <UpArrowIcon /> : <DownArrowIcon />}
      </TouchableOpacity>

      <Modal
        visible={showOrderOptions}
        transparent={true}
        animationType='fade'
        onRequestClose={handleSortClick}
      >
        <Pressable style={styles.overlay} onPress={handleSortClick}>
          <View
            style={[
              styles.dropdown,
              buttonPosition && {
                position: 'absolute',
                top: buttonPosition.y + buttonPosition.height + 4,
                right:
                  screenWidth - (buttonPosition.x + buttonPosition.width),
              },
            ]}
          >
            {order.mapOrderOptions(option => (
              <TouchableOpacity
                key={option.getOrder()}
                style={styles.dropdownItem}
                onPress={() => handleSortOptionClick(option)}
              >
                <PretendardText
                  weight={option.isSelected() ? 'semibold' : 'regular'}
                  style={[
                    styles.dropdownText,
                    {
                      color: option.isSelected()
                        ? Color.textPrimary
                        : Color.textSecondary,
                    },
                  ]}
                >
                  {option.getName()}
                </PretendardText>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
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
    color: Color.textPrimary,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  overlay: {
    flex: 1,
  },
  dropdown: {
    backgroundColor: Color.background,
    borderRadius: Radius.card,
    minWidth: 120,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
        borderWidth: 1,
        borderColor: Color.borderLight,
      },
    }),
  },
  dropdownItem: {
    padding: 10,
  },
  dropdownText: {
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default observer(OrderButtonView);
