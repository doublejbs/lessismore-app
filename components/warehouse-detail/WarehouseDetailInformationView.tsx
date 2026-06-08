import { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import GearImageView from '../warehouse/GearImageView';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  gear: Gear;
  canShowSharedImages?: boolean | undefined;
  onSelectOtherImage?: () => void;
  onEdit?: () => void;
}

const WarehouseDetailInformationView: FC<Props> = ({
  gear,
  canShowSharedImages,
  onSelectOtherImage,
  onEdit,
}) => {
  const imageUrl = gear.getImageUrl();
  const company = gear.getCompany();
  const name = gear.getDisplayName();
  const weight = gear.getWeight();
  const color = gear.getColor();
  const isAdded = gear.isAdded();

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <View style={styles.imageWrapper}>
            <GearImageView imageUrl={imageUrl} />
          </View>
        ) : (
          <Ionicons name='camera-outline' size={24} color='black' />
        )}
        {canShowSharedImages && isAdded && (
          <TouchableOpacity
            style={styles.selectOtherImageButton}
            onPress={onSelectOtherImage}
          >
            <Ionicons name='images-outline' size={14} color='#666' />
            <Text style={styles.selectOtherImageText}>대표 사진 변경</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.infoSection}>
          <View style={styles.productInfo}>
            <Text style={styles.companyText}>{company}</Text>
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.colorText}>{color}</Text>
          </View>
          <View style={styles.weightContainer}>
            <Text style={styles.weightText}>{weight}g</Text>
          </View>
        </View>
        {isAdded && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Text style={styles.editButtonText}>수정하기</Text>
            <Ionicons name='chevron-forward' size={14} color='#000000' />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  imageWrapper: {
    height: 180,
    width: '100%',
  },
  selectOtherImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F3F3',
    borderRadius: 16,
  },
  selectOtherImageText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 14,
  },
  contentContainer: {
    flexDirection: 'column',
    gap: 14,
  },
  infoSection: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  productInfo: {
    flexDirection: 'column',
  },
  companyText: {
    fontSize: 13,
    color: 'black',
  },
  nameText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  colorText: {
    fontSize: 16,
    color: 'black',
  },
  weightContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  weightText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'black',
  },
  editButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  editButtonText: {
    fontSize: 14,
    color: '#000000',
  },
});

export default observer(WarehouseDetailInformationView);
