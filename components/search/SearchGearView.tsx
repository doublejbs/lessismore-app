import React, { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  Pressable,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { Color } from '@/constants/DesignTokens';
import GearRowActions from '@/model/browse/GearRowActions';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import GearView from '@/components/warehouse/GearView';
import LoadingView from '@/components/ui/LoadingView';
import SearchGearAddToBagModalView from './SearchGearAddToBagModalView';
import app from '@/model/app/App';

interface Props {
  searchWarehouse: GearRowActions;
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
        app
          .getAnalyticsManager()
          ?.logClick('search_add', { target: 'warehouse' });
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

  const handleGearPress = () => {
    app.getAnalyticsManager()?.logClick('gear_item', { from: 'search' });
    searchWarehouse.goToGearDetail(gear);
  };

  return (
    <>
      <Pressable style={styles.wrapper} onPress={handleGearPress}>
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
              <Ionicons name='checkmark' size={16} color={Color.background} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
              <Ionicons name='add' size={16} color={Color.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
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
    backgroundColor: Color.chipActiveBg,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: Color.surfaceMuted,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(SearchGearView);
