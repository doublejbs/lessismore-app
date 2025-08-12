import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Gear from '@/model/gear/Gear';
import GearView from '@/components/warehouse/GearView';

interface Props {
  searchWarehouse: SearchWarehouse;
  gear: Gear;
}

const SearchGearView: FC<Props> = ({ gear, searchWarehouse }) => {
  const isAdded = gear.isAdded();
  const isSelected = searchWarehouse.isSelected(gear);

  const handlePress = () => {
    if (isAdded) {
      return;
    } else {
      searchWarehouse.toggle(gear);
    }
  };

  const handleToggle = () => {
    searchWarehouse.toggle(gear);
  };

  return (
    <GearView gear={gear} onPress={handlePress}>
      <View style={styles.container}>
        <View style={styles.checkboxContainer}>
          {isAdded ? (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedText}>보유중</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleToggle} style={styles.checkbox}>
              <View
                style={[
                  styles.checkboxInner,
                  {
                    backgroundColor: isSelected ? '#000' : '#fff',
                  },
                ]}
              >
                {isSelected && (
                  <Ionicons name='checkmark' size={16} color='white' />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GearView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    minWidth: 40,
    height: 80,
  },
  checkboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    height: 32,
    flexShrink: 0,
  },
  ownedBadge: {
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedText: {
    fontSize: 12,
    fontFamily: 'Pretendard-Regular',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(SearchGearView);
