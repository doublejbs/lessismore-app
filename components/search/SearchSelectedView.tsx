import { FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import GearImageView from '@/components/warehouse/GearImageView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchSelectedView: FC<Props> = ({ searchWarehouse }) => {
  const selectedCount = searchWarehouse.getSelectedCount();
  const selected = searchWarehouse.getSelected();

  if (selectedCount > 0) {
    return (
      <ScrollView
        horizontal
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsHorizontalScrollIndicator={false}
      >
        {selected.map(gear => {
          const handlePressDelete = () => {
            searchWarehouse.deleteSelected(gear);
          };

          return (
            <View key={gear.getId()} style={styles.itemContainer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handlePressDelete}
              >
                <View style={styles.deleteButtonBackground}>
                  <Ionicons name='close' size={16} color='white' />
                </View>
              </TouchableOpacity>

              <View style={styles.imageContainer}>
                <GearImageView imageUrl={gear.getImageUrl()} />
              </View>

              <Text
                style={styles.nameText}
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {gear.getName()}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
  },
  contentContainer: {
    paddingTop: 12,
    paddingLeft: 20,
    gap: 22,
  },
  itemContainer: {
    flexDirection: 'column',
    maxWidth: 64,
    gap: 2,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    right: -10,
    top: 2,
    zIndex: 1,
  },
  deleteButtonBackground: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 4,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E7E7E7',
  },
  nameText: {
    fontSize: 13,
    fontFamily: 'Pretendard-Regular',
    textAlign: 'center',
  },
});

export default observer(SearchSelectedView);
