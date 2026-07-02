import React, { FC, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import BagEditWarehouseView from './BagEditWarehouseView';
import BagEditWarehouseFiltersView from './BagEditWarehouseFiltersView';
import BagEdit from '../../model/bag-edit/BagEdit';
import BagEditHeaderView from './BagEditHeaderView';
import Layout from '../Layout';
import { useFocusEffect } from 'expo-router';

interface Props {
  bagEdit: BagEdit;
}

const BagEditView: FC<Props> = ({ bagEdit }) => {
  const weight = bagEdit.getWeight();

  const handlePressBack = () => {
    bagEdit.back();
  };

  const handlePressAddGear = () => {
    bagEdit.showCustom();
  };

  const handlePressConfirm = () => {
    bagEdit.back();
  };

  useFocusEffect(
    useCallback(() => {
      bagEdit.initialize();
    }, [])
  );

  if (!bagEdit.isInitialized()) {
    return null;
  } else {
    return (
      <Layout paddingHorizontal={0}>
        <View style={{ paddingHorizontal: 20 }}>
          <BagEditHeaderView
            weight={weight.toString()}
            onPressBack={handlePressBack}
          />
        </View>
        <View style={styles.mainContent}>
          <View style={[styles.titleSection, { paddingHorizontal: 20 }]}>
            <Text style={styles.titleText}>내 장비</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handlePressAddGear}
              activeOpacity={0.7}
            >
              <View style={styles.addIconContainer}>
                <Svg width={14} height={14} viewBox='0 0 14 14' fill='none'>
                  <Path d='M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z' fill='black' />
                </Svg>
              </View>
              <PretendardText style={styles.addButtonText}>
                장비 추가
              </PretendardText>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <BagEditWarehouseFiltersView bagEdit={bagEdit} />
          </View>
          <View style={styles.warehouseContainer}>
            <BagEditWarehouseView bagEdit={bagEdit} />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handlePressConfirm}
          >
            <PretendardText style={styles.confirmButtonText}>
              확인
            </PretendardText>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  mainContent: {
    flex: 1,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#EBEBEB',
    borderRadius: 26,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addIconContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    lineHeight: 14,
  },
  warehouseContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  confirmButton: {
    backgroundColor: 'black',
    width: '100%',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default observer(BagEditView);
