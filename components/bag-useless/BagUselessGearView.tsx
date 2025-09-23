import React, { FC } from 'react';
import { View, TouchableOpacity } from 'react-native';
import GearView from '../warehouse/GearView';
import Gear from '../../model/gear/Gear';
import BagUseless from '../../model/bag-useless/BagUseless';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  gear: Gear;
  bagUseless: BagUseless;
}

const BagUselessGearView: FC<Props> = ({ gear, bagUseless }) => {
  const isSelected = bagUseless.isSelected(gear);

  const handlePress = () => {
    bagUseless.toggle(gear);
  };

  return (
    <GearView gear={gear} onPress={handlePress}>
      <View
        style={{
          flexDirection: 'column',
          minWidth: 24,
          height: '100%',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: 24,
            height: 24,
            flexShrink: 0,
          }}
        >
          <TouchableOpacity
            onPress={handlePress}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                backgroundColor: isSelected ? '#000' : '#fff',
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: 4,
              }}
            >
              {isSelected && (
                <Ionicons name='checkmark' size={16} color='white' />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </GearView>
  );
};

export default observer(BagUselessGearView);
