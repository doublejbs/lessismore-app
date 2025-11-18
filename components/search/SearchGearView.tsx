import React, { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Gear from '@/model/gear/Gear';
import GearView from '@/components/warehouse/GearView';
import LoadingView from '@/components/ui/LoadingView';

interface Props {
  searchWarehouse: SearchWarehouse;
  gear: Gear;
}

const SearchGearView: FC<Props> = ({ gear, searchWarehouse }) => {
  const isAdded = gear.isAdded();
  const [loading, setLoading] = useState(false);

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await searchWarehouse.registerSingle(gear);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await searchWarehouse.removeSingle(gear);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.gearContainer}>
        <GearView gear={gear} />
      </View>
      <View style={styles.buttonContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingView duration={1000} />
          </View>
        ) : isAdded ? (
          <TouchableOpacity
            style={styles.ownedBadge}
            onPress={handleRemovePress}
          >
            <Ionicons name='checkmark' size={20} color='#fff' />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
            <Ionicons name='add' size={20} color='#000' />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  gearContainer: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedBadge: {
    backgroundColor: '#000',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#F6F6F6',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(SearchGearView);
