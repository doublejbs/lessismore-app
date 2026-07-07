import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import GearImageView from '../warehouse/GearImageView';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
          <Ionicons name='camera-outline' size={24} color={Color.textPrimary} />
        )}
        {canShowSharedImages && isAdded && (
          <TouchableOpacity
            style={styles.selectOtherImageButton}
            onPress={onSelectOtherImage}
          >
            <Ionicons name='images-outline' size={14} color={Color.textTertiary} />
            <PretendardText style={styles.selectOtherImageText}>
              대표 사진 변경
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.infoSection}>
          <View style={styles.productInfo}>
            <PretendardText style={styles.companyText}>{company}</PretendardText>
            <PretendardText
              weight='bold'
              style={styles.nameText}
              lineBreakStrategyIOS='hangul-word'
            >
              {name}
            </PretendardText>
            <PretendardText style={styles.colorText}>{color}</PretendardText>
          </View>
          <View style={styles.weightContainer}>
            <PretendardText weight='bold' style={styles.weightText}>
              {weight}g
            </PretendardText>
          </View>
        </View>
        {isAdded && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <PretendardText style={styles.editButtonText}>수정하기</PretendardText>
            <Ionicons name='chevron-forward' size={14} color={Color.textPrimary} />
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
    backgroundColor: Color.inputBg,
    borderRadius: Radius.modal,
  },
  selectOtherImageText: {
    fontSize: 12,
    color: Color.textTertiary,
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
    flex: 1,
    flexDirection: 'column',
  },
  companyText: {
    fontSize: 13,
    color: Color.textPrimary,
  },
  nameText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  colorText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  weightContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  weightText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    borderRadius: Radius.card,
    width: '100%',
  },
  editButtonText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
});

export default observer(WarehouseDetailInformationView);
