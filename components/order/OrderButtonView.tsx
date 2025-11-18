import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Svg, { Path } from 'react-native-svg';
import Order from '@/model/order/Order';
import OrderOption from '@/model/order/OrderOption';

interface Props {
  order: Order;
}

const OrderButtonView = ({ order }: Props) => {
  const showOrderOptions = order.isShowOrderOptions();
  const selectedOrderName = order.getSelectedOrderName();

  const handleSortClick = () => {
    order.toggleOrderOptions();
  };

  const handleSortOptionClick = (orderOption: OrderOption) => {
    order.setOrderOption(orderOption);
  };

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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleSortClick}>
        <Text style={styles.buttonText}>{selectedOrderName}</Text>
        {showOrderOptions ? <UpArrowIcon /> : <DownArrowIcon />}
      </TouchableOpacity>

      {showOrderOptions && (
        <View style={styles.dropdown}>
          {order.mapOrderOptions(option => (
            <TouchableOpacity
              key={option.getOrder()}
              style={styles.dropdownItem}
              onPress={() => handleSortOptionClick(option)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  {
                    color: option.isSelected()
                      ? 'rgb(204, 241, 36)'
                      : '#505967',
                  },
                ]}
              >
                {option.getName()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    color: 'black',
    fontWeight: 'bold',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: 'white',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 8,
    zIndex: 10,
    minWidth: 120,
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
