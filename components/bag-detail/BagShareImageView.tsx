import { FC, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import BagDetail from '@/model/bag-detail/BagDetail';
import GearFilter from '@/model/gear/GearFilter';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

interface Props {
  bagDetail: BagDetail;
}

const BagShareImageView: FC<Props> = ({ bagDetail }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const handlePress = () => {
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
  };

  const handleShare = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          '공유 불가',
          '이 기기에서는 공유 기능을 사용할 수 없습니다.'
        );
        return;
      }

      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: '공유 이미지',
        });
      }
    } catch (error) {
      console.error('이미지 공유 실패:', error);
      Alert.alert('공유 실패', '이미지 공유 중 오류가 발생했습니다.');
    } finally {
      setIsSharing(false);
    }
  };

  const renderCategoryBox = (
    category: GearFilter,
    emoji: string,
    style: any
  ) => {
    const categoryData = bagDetail
      .getGearsByCategory()
      .find(({ category: cat }) => cat.getFilter() === category);

    if (!categoryData || categoryData.gears.length === 0) {
      return <View style={[styles.box, styles.emptyBox, style]} />;
    }

    const totalWeight = categoryData.gears
      .reduce((sum, gear) => sum + parseFloat(gear.getWeight()), 0)
      .toFixed(2);

    const categoryName = getCategoryName(category);

    return (
      <View style={[styles.box, styles.filledBox, style]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.categoryLabel}>
          {categoryName} {totalWeight}kg
        </Text>
        <View style={styles.gearNames}>
          {categoryData.gears.slice(0, 5).map((gear, index) => (
            <Text key={index} style={styles.gearName} numberOfLines={1}>
              {gear.getName()}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const getCategoryName = (category: GearFilter): string => {
    const names: Record<string, string> = {
      [GearFilter.Backpack]: 'Bag',
      [GearFilter.Tent]: 'Tent',
      [GearFilter.SleepingBag]: 'Sleeping',
      [GearFilter.Cooking]: 'Cooking',
      [GearFilter.Lantern]: 'Light',
      [GearFilter.Mat]: 'Mat',
      [GearFilter.Clothing]: 'Clothing',
    };
    return names[category] || '';
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.touchableContainer}
          onPress={handlePress}
        >
          <View style={styles.textContainer}>
            <Text style={styles.descriptionText}>공유 이미지 만들기</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name='chevron-forward' size={24} color='#191F28' />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType='fade'
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Ionicons name='close' size={32} color='#FFFFFF' />
          </TouchableOpacity>

          <ViewShot
            ref={viewShotRef}
            options={{
              format: 'png',
              quality: 1.0,
            }}
            style={styles.shareImageContainer}
          >
            {/* 배낭 - 좌상단 */}
            {renderCategoryBox(GearFilter.Backpack, '🎒', styles.boxBackpack)}

            {/* 텐트 - 중상단 */}
            {renderCategoryBox(GearFilter.Tent, '⛺', styles.boxTent)}

            {/* 빈칸 - 우상단 */}
            <View style={[styles.box, styles.emptyBox, styles.boxTopRight]} />

            {/* 빈칸 - 좌중단 */}
            <View style={[styles.box, styles.emptyBox, styles.boxMiddleLeft]} />

            {/* 무게 - 중중단 */}
            <View style={[styles.box, styles.weightBox, styles.boxWeight]}>
              <Text style={styles.weightText}>{bagDetail.getWeight()}kg</Text>
            </View>

            {/* 빈칸 - 우중단 */}
            <View
              style={[styles.box, styles.emptyBox, styles.boxMiddleRight]}
            />

            {/* 빈칸 - 좌하단 */}
            <View style={[styles.box, styles.emptyBox, styles.boxBottomLeft]} />

            {/* 조리 - 중하단 */}
            {renderCategoryBox(GearFilter.Cooking, '🍳', styles.boxCooking)}

            {/* 침낭 - 우하단 */}
            {renderCategoryBox(
              GearFilter.SleepingBag,
              '🛌',
              styles.boxSleeping
            )}
          </ViewShot>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={isSharing}
            activeOpacity={0.8}
          >
            <Ionicons
              name='share-outline'
              size={24}
              color='#FFFFFF'
              style={styles.shareIcon}
            />
            <Text style={styles.shareButtonText}>
              {isSharing ? '공유 중...' : '공유하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const SIZE = Dimensions.get('window').width - 40;
const SCALE = SIZE / 1080;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: 'white',
    marginVertical: 8,
  },
  touchableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
  },
  textContainer: {
    gap: 4,
  },
  descriptionText: {
    fontSize: 17,
    fontWeight: '500',
    color: 'black',
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#43CB57',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  shareIcon: {
    marginRight: 4,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  shareImageContainer: {
    width: SIZE,
    height: SIZE,
    backgroundColor: '#DCDFE2',
    borderRadius: 8,
    position: 'relative',
  },
  box: {
    position: 'absolute',
    borderRadius: 30 * SCALE,
    padding: 12 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 배낭 - 좌상단: x:24, y:34, w:284, h:392
  boxBackpack: {
    left: 24 * SCALE,
    top: 34 * SCALE,
    width: 284 * SCALE,
    height: 392 * SCALE,
  },
  // 텐트 - 중상단: x:323, y:34, w:433, h:392
  boxTent: {
    left: 323 * SCALE,
    top: 34 * SCALE,
    width: 433 * SCALE,
    height: 392 * SCALE,
  },
  // 빈칸 - 우상단: x:771, y:34, w:289, h:260
  boxTopRight: {
    left: 771 * SCALE,
    top: 34 * SCALE,
    width: 289 * SCALE,
    height: 260 * SCALE,
  },
  // 빈칸 - 좌중단: x:24, y:446, w:284, h:333
  boxMiddleLeft: {
    left: 24 * SCALE,
    top: 446 * SCALE,
    width: 284 * SCALE,
    height: 333 * SCALE,
  },
  // 무게 - 중중단: x:323, y:447, w:433, h:202
  boxWeight: {
    left: 323 * SCALE,
    top: 447 * SCALE,
    width: 433 * SCALE,
    height: 202 * SCALE,
  },
  // 빈칸 - 우중단: x:771, y:316, w:289, h:333
  boxMiddleRight: {
    left: 771 * SCALE,
    top: 316 * SCALE,
    width: 289 * SCALE,
    height: 333 * SCALE,
  },
  // 빈칸 - 좌하단: x:24, y:801, w:284, h:259
  boxBottomLeft: {
    left: 24 * SCALE,
    top: 801 * SCALE,
    width: 284 * SCALE,
    height: 259 * SCALE,
  },
  // 조리 - 중하단: x:323, y:671, w:235, h:389
  boxCooking: {
    left: 323 * SCALE,
    top: 671 * SCALE,
    width: 235 * SCALE,
    height: 389 * SCALE,
  },
  // 침낭 - 우하단: x:576, y:671, w:484, h:389
  boxSleeping: {
    left: 576 * SCALE,
    top: 671 * SCALE,
    width: 484 * SCALE,
    height: 389 * SCALE,
  },
  emptyBox: {
    backgroundColor: '#F1EFF3',
  },
  filledBox: {
    backgroundColor: '#FFFFFF',
  },
  weightBox: {
    backgroundColor: '#43CB57',
  },
  emoji: {
    fontSize: 48 * SCALE,
    marginBottom: 8 * SCALE,
  },
  categoryLabel: {
    fontSize: 16 * SCALE,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4 * SCALE,
  },
  gearNames: {
    width: '100%',
    gap: 2 * SCALE,
  },
  gearName: {
    fontSize: 10 * SCALE,
    color: '#000000',
    textAlign: 'center',
  },
  weightText: {
    fontSize: 40 * SCALE,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default observer(BagShareImageView);
