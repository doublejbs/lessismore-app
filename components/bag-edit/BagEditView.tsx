import { FC, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '../PretendardText';
import BagEditWarehouseView from './BagEditWarehouseView';
import BagEditWarehouseFiltersView from './BagEditWarehouseFiltersView';
import BagEdit from '../../model/bag-edit/BagEdit';
import app from '../../model/app/App';
import BagEditHeaderView from './BagEditHeaderView';
import Layout from '../Layout';
import { useFocusEffect } from 'expo-router';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

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
    app.getAnalyticsManager()?.logClick('bag_edit_confirm');
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
        <View style={{ paddingHorizontal: Spacing.screenH }}>
          <BagEditHeaderView
            weight={weight.toString()}
            onPressBack={handlePressBack}
            onPressAddGear={handlePressAddGear}
          />
        </View>
        <View style={styles.mainContent}>
          <View style={[styles.titleSection, { paddingHorizontal: Spacing.screenH }]}>
            <PretendardText style={styles.titleText} weight='bold'>
              내 장비
            </PretendardText>
          </View>
          <View style={{ paddingHorizontal: Spacing.screenH }}>
            <View style={styles.searchBox}>
              <Ionicons name='search' size={18} color={Color.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder='장비 검색'
                placeholderTextColor={Color.textSecondary}
                value={bagEdit.getQuery()}
                onChangeText={value => bagEdit.setQuery(value)}
                autoCorrect={false}
                returnKeyType='search'
              />
              {bagEdit.getQuery().length > 0 && (
                <TouchableOpacity
                  onPress={() => bagEdit.setQuery('')}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel='검색어 지우기'
                >
                  <Ionicons
                    name='close-circle'
                    size={18}
                    color={Color.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={{ paddingHorizontal: Spacing.screenH }}>
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
            activeOpacity={0.8}
            accessibilityRole='button'
          >
            <PretendardText style={styles.confirmButtonText} weight='semibold'>
              완료
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
    backgroundColor: Color.background,
  },
  mainContent: {
    flex: 1,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Color.background,
  },
  titleText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  warehouseContainer: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
  },
  buttonContainer: {
    paddingTop: Spacing.item,
    paddingHorizontal: Spacing.screenH,
    backgroundColor: Color.background,
  },
  confirmButton: {
    backgroundColor: Color.chipActiveBg,
    width: '100%',
    padding: 14,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Color.background,
    fontSize: 16,
  },
});

export default observer(BagEditView);
