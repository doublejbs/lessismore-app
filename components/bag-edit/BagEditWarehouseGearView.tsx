import React, { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import Gear from '../../model/gear/Gear';
import BagEdit from '../../model/bag-edit/BagEdit';
import { observer } from 'mobx-react-lite';
import GearView from '../warehouse/GearView';

interface Props {
  gear: Gear;
  bagEdit: BagEdit;
}

const BagEditWarehouseGearView: FC<Props> = ({ gear, bagEdit }) => {
  const isSelected = bagEdit.hasGear(gear);

  const handlePress = () => {
    bagEdit.toggleGear(gear);
  };

  return (
    <GearView gear={gear} onPress={handlePress}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? '#000' : '#fff',
            },
          ]}
        >
          {isSelected && (
            <Svg width={16} height={16} viewBox='0 0 24 24' fill='none'>
              <Polyline
                points='20,6 9,17 4,12'
                stroke='white'
                strokeWidth={2}
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </Svg>
          )}
        </View>
      </TouchableOpacity>
    </GearView>
  );
};

const styles = StyleSheet.create({
  checkboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
  },
});

export default observer(BagEditWarehouseGearView);
