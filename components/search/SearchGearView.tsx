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
import Bag from '@/model/bag/Bag';
import GearView from '@/components/warehouse/GearView';
import LoadingView from '@/components/ui/LoadingView';
import SearchGearAddToBagModalView from './SearchGearAddToBagModalView';

interface Props {
  searchWarehouse: SearchWarehouse;
  gear: Gear;
  bag: Bag;
}

const SearchGearView: FC<Props> = ({ gear, searchWarehouse, bag }) => {
  const isAdded = gear.isAdded();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const success = await searchWarehouse.registerSingle(gear);
      if (success) {
        setShowModal(true);
      }
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

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
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
              <Ionicons name='checkmark' size={16} color='#fff' />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
              <Ionicons name='add' size={16} color='#000' />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <SearchGearAddToBagModalView
        visible={showModal}
        onClose={handleCloseModal}
        gear={gear}
        bag={bag}
      />
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
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

export default observer(SearchGearView);
