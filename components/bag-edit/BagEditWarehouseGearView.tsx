import React, { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <View style={styles.buttonContainer}>
        {isSelected ? (
          <TouchableOpacity style={styles.selectedBadge} onPress={handlePress}>
            <Ionicons name='checkmark' size={16} color='#fff' />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={handlePress}>
            <Ionicons name='add' size={16} color='#000' />
          </TouchableOpacity>
        )}
      </View>
    </GearView>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  selectedBadge: {
    backgroundColor: '#000',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#F6F6F6',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagEditWarehouseGearView);
