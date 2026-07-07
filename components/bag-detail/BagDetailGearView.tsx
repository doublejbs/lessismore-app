import React, { FC, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Gear from '@/model/gear/Gear';
import BagDetail from '@/model/bag-detail/BagDetail';
import app from '@/model/app/App';
import BagDetailImageView from './BagDetailImageView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
    app.getAnalyticsManager()?.logClick('gear_item', { from: 'bag_detail' });
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
                <PretendardText style={styles.companyText}>
                  {gear.getCompany()}
                </PretendardText>
                {gear.hasUsedRate() && (
                  <View style={styles.usageRateBadge}>
                    <PretendardText style={styles.usageRateText}>
                      사용률 {gear.getUsedRate()}%
                    </PretendardText>
                  </View>
                )}
              </View>
              <PretendardText
                style={styles.nameText}
                weight='bold'
                numberOfLines={1}
              >
                {gear.getDisplayName()}
              </PretendardText>
              <PretendardText style={styles.colorText}>
                {gear.getColor()}
              </PretendardText>
              <PretendardText style={styles.weightText} weight='bold'>
                {gear.getWeight()}g
              </PretendardText>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuButton} onPress={handlePressMenu}>
            <Ionicons
              name='ellipsis-vertical'
              size={18}
              color={Color.textPrimary}
            />
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
                <Ionicons
                  name='create-outline'
                  size={20}
                  color={Color.textPrimary}
                />
                <PretendardText style={styles.actionText}>수정하기</PretendardText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePressDelete}
              >
                <Ionicons
                  name='trash-outline'
                  size={20}
                  color={Color.textPrimary}
                />
                <PretendardText style={styles.actionText}>삭제하기</PretendardText>
              </TouchableOpacity>
            </View>

            <View style={styles.closeButtonContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
              >
                <PretendardText style={styles.closeButtonText} weight='medium'>
                  닫기
                </PretendardText>
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
    color: Color.textPrimary,
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
    backgroundColor: Color.thumbBg,
    borderRadius: Radius.listThumb,
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
    color: Color.textPrimary,
  },
  usageRateBadge: {
    borderRadius: Radius.card,
    backgroundColor: Color.chipInactiveBg,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  usageRateText: {
    fontSize: 10,
    color: Color.textPrimary,
  },
  nameText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  colorText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  weightText: {
    fontSize: 14,
    color: Color.textPrimary,
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
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
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
    color: Color.textPrimary,
  },
  closeButtonContainer: {
    paddingHorizontal: 20,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Color.chipActiveBg,
    padding: 18,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default observer(BagDetailGearView);
