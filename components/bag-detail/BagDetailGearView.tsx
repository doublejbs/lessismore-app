import React, { FC, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Gear from '@/model/gear/Gear';
import BagDetail from '@/model/bag-detail/BagDetail';
import BagDetailImageView from './BagDetailImageView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  gear: Gear;
  bagDetail: BagDetail;
}

const BagDetailGearView: FC<Props> = ({ gear, bagDetail }) => {
  const imageUrl = gear.getImageUrl();
  const isUseless = bagDetail.isUseless(gear);
  const [showMenu, setShowMenu] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handlePressGear = () => {
    router.push(`/gear-detail/${gear.getId()}`);
  };

  const handlePressMenu = () => {
    setShowMenu(true);
  };

  const handlePressDelete = () => {
    bagDetail.delete(gear);
    setShowMenu(false);
  };

  const handlePressEdit = () => {
    setShowMenu(false);
    bagDetail.goToEditGear(gear);
  };

  const handleCloseModal = () => {
    setShowMenu(false);
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.gearItemContainer}
          onPress={handlePressGear}
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            <BagDetailImageView imageUrl={imageUrl} shadow={isUseless} />
            {isUseless && (
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.uselessOverlay}
              />
            )}
          </View>

          <View
            style={[styles.contentContainer, { opacity: isUseless ? 0.5 : 1 }]}
          >
            <View style={styles.gearInfo}>
              <View style={styles.companyRow}>
                <Text style={styles.companyText}>{gear.getCompany()}</Text>
                {gear.hasUsedRate() && (
                  <View style={styles.usageRateBadge}>
                    <Text style={styles.usageRateText}>
                      사용률 {gear.getUsedRate()}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.nameText} numberOfLines={1}>
                {gear.getName()}
              </Text>
              <Text style={styles.colorText}>{gear.getColor()}</Text>
              <Text style={styles.weightText}>{gear.getWeight()}g</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuButton} onPress={handlePressMenu}>
            <Ionicons name='ellipsis-vertical' size={18} color='black' />
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        visible={showMenu}
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleCloseModal}
          activeOpacity={1}
        >
          <View
            style={[styles.modalContent, { paddingBottom: 12 + insets.bottom }]}
          >
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePressEdit}
              >
                <Ionicons name='create-outline' size={20} color='black' />
                <Text style={styles.actionText}>수정하기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePressDelete}
              >
                <Ionicons name='trash-outline' size={20} color='black' />
                <Text style={styles.actionText}>삭제하기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.closeButtonContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
  },
  gearItemContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  imageContainer: {
    width: 80,
    height: 80,
    minWidth: 80,
    backgroundColor: '#F1F1F1',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uselessOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    transform: [{ rotate: '-10.78deg' }],
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  gearInfo: {
    flex: 1,
    gap: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyText: {
    fontSize: 12,
  },
  usageRateBadge: {
    borderRadius: 8,
    backgroundColor: '#EBEBEB',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  usageRateText: {
    fontSize: 10,
    color: 'black',
  },
  nameText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  colorText: {
    fontSize: 14,
  },
  weightText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuContainer: {
    minWidth: 32,
    justifyContent: 'center',
  },
  menuButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  modalActions: {
    paddingHorizontal: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 18,
    gap: 10,
  },
  actionText: {
    fontSize: 16,
    color: 'black',
  },
  closeButtonContainer: {
    paddingHorizontal: 20,
  },
  closeButton: {
    width: '100%',
    backgroundColor: 'black',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default observer(BagDetailGearView);
