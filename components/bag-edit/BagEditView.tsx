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

  useFocusEffect(
    useCallback(() => {
      bagEdit.initialize();
    }, [])
  );

  if (!bagEdit.isInitialized()) {
    return null;
  } else {
    return (
      <Layout>
        <BagEditHeaderView
          weight={weight.toString()}
          onPressBack={handlePressBack}
        />

        {/* 메인 콘텐츠 */}
        <View style={styles.mainContent}>
          <View style={styles.titleSection}>
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
          <BagEditWarehouseFiltersView bagEdit={bagEdit} />
          <BagEditWarehouseView bagEdit={bagEdit} />
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
});

export default observer(BagEditView);
