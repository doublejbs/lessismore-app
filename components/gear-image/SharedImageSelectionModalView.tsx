import { FC, useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import GearImageType from '@/model/gear/GearImageType';
import FirebaseImageStorage from '@/model/firebase/FirebaseImageStorage';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  visible: boolean;
  gearId: string;
  images: GearImageType[];
  loading: boolean;
  selectedImageUrl?: string;
  onClose: () => void;
  onSelectImage: (image: GearImageType) => void;
  onUploadComplete: () => void;
}

const SharedImageSelectionModalView: FC<Props> = ({
  visible,
  gearId,
  images,
  loading,
  selectedImageUrl,
  onClose,
  onSelectImage,
  onUploadComplete,
}) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingImage, setPendingImage] = useState<GearImageType | null>(null);

  const currentSelectedUrl = pendingImage?.url ?? selectedImageUrl;
  const currentUserId = app.getFirebase().getUserId();

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const getImageMimeType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setUploading(true);

      const fileName = asset.fileName || 'image.jpg';
      const file = {
        uri: asset.uri,
        name: fileName,
        type: getImageMimeType(fileName),
      };

      const imageStorage = FirebaseImageStorage.new();
      const imageId = generateId();
      const imageUrl = await imageStorage.uploadGearSharedImage(
        file,
        gearId,
        imageId
      );

      const gearImageStore = app.getGearImageStore();
      const firebase = app.getFirebase();
      const nickname = firebase.getNickname();

      if (gearImageStore) {
        await gearImageStore.addImage(gearId, imageId, imageUrl, nickname);
      }

      app.getToastManager()?.show({ message: '사진이 업로드되었습니다.' });
      onUploadComplete();
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      Alert.alert('오류', '사진을 업로드하는 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '사진을 촬영하려면 카메라 접근 권한이 필요합니다.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('카메라 촬영 오류:', error);
      Alert.alert('오류', '사진을 촬영하는 중 오류가 발생했습니다.');
    }
  };

  const handleGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '사진을 선택하려면 갤러리 접근 권한이 필요합니다.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '사진을 선택하는 중 오류가 발생했습니다.');
    }
  };

  const handleConfirm = () => {
    if (pendingImage) {
      onSelectImage(pendingImage);
    }
  };

  const handleClose = () => {
    setPendingImage(null);
    onClose();
  };

  const isMyImage = (image: GearImageType): boolean => {
    return image.uploadedBy === currentUserId;
  };

  const handleDeleteImage = async (image: GearImageType) => {
    if (!isMyImage(image)) {
      return;
    }

    const executeDelete = async () => {
      try {
        setDeleting(true);

        const imageStorage = FirebaseImageStorage.new();
        await imageStorage.deleteGearSharedImage(gearId, image.id);

        const gearImageStore = app.getGearImageStore();
        if (gearImageStore) {
          await gearImageStore.deleteImage(gearId, image.id);
        }

        if (pendingImage?.id === image.id) {
          setPendingImage(null);
        }

        app.getToastManager()?.show({ message: '사진이 삭제되었습니다.' });
        onUploadComplete();
      } catch (error) {
        console.error('이미지 삭제 오류:', error);
        Alert.alert('오류', '사진을 삭제하는 중 오류가 발생했습니다.');
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['취소', '삭제'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
          title: '사진 삭제',
          message: '이 사진을 삭제하시겠습니까?',
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            executeDelete();
          }
        }
      );
    } else {
      Alert.alert(
        '사진 삭제',
        '이 사진을 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: executeDelete,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleUploadPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['취소', '사진 촬영', '사진 보관함에서 선택'],
          cancelButtonIndex: 0,
          title: '사진 업로드',
        },
        buttonIndex => {
          switch (buttonIndex) {
            case 1:
              handleCamera();
              break;
            case 2:
              handleGallery();
              break;
            default:
              break;
          }
        }
      );
    } else {
      Alert.alert(
        '사진 업로드',
        '어떤 방법으로 사진을 추가하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '사진 촬영', onPress: handleCamera },
          { text: '갤러리에서 선택', onPress: handleGallery },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
          <PretendardText weight='semibold' style={styles.headerTitle}>
            대표 사진 변경
          </PretendardText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.guideContainer}>
          <PretendardText style={styles.guideText}>
            사진을 업로드하면 다른 사용자가 볼 수 있고 활용할 수 있습니다.
          </PretendardText>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color={Color.textPrimary} />
            </View>
          ) : (
            <View style={styles.imageGridContainer}>
              <PretendardText style={styles.imageCountText}>
                {images.length}개의 사진
              </PretendardText>
              <View style={styles.imageGridList}>
                <TouchableOpacity
                  style={styles.uploadGridItem}
                  onPress={handleUploadPress}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size='small' color={Color.textTertiary} />
                  ) : (
                    <>
                      <Ionicons name='add' size={32} color={Color.textTertiary} />
                      <PretendardText style={styles.uploadGridText}>
                        사진 추가
                      </PretendardText>
                    </>
                  )}
                </TouchableOpacity>
                {images.map(image => {
                  const isSelected = currentSelectedUrl === image.url;
                  const isMine = isMyImage(image);

                  return (
                    <TouchableOpacity
                      key={image.id}
                      style={[
                        styles.imageGridItem,
                        isSelected && styles.imageGridItemSelected,
                      ]}
                      onPress={() => setPendingImage(image)}
                      disabled={deleting}
                    >
                      <Image
                        source={{ uri: image.url }}
                        style={styles.imageGridImage}
                        contentFit='cover'
                      />
                      {isSelected && (
                        <>
                          <View style={styles.imageOverlay} />
                          <View style={styles.checkIconContainer}>
                            <Ionicons
                              name='checkmark'
                              size={14}
                              color={Color.background}
                            />
                          </View>
                        </>
                      )}
                      {isMine && (
                        <>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteImage(image)}
                            disabled={deleting}
                          >
                            <Ionicons name='close' size={12} color={Color.background} />
                          </TouchableOpacity>
                          <View style={styles.uploaderInfo}>
                            <PretendardText
                              style={styles.uploaderName}
                              numberOfLines={1}
                            >
                              내가 올린 사진
                            </PretendardText>
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
        {pendingImage && (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <PretendardText
                weight='semibold'
                style={styles.confirmButtonText}
              >
                확인
              </PretendardText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.surfaceMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Color.background,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  guideContainer: {
    backgroundColor: Color.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  guideText: {
    fontSize: 13,
    color: Color.background,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  imageGridContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  imageCountText: {
    fontSize: 14,
    color: Color.textTertiary,
    marginBottom: 16,
  },
  imageGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  uploadGridItem: {
    width: 108,
    height: 108,
    borderRadius: Radius.card,
    backgroundColor: Color.thumbBg,
    borderWidth: 2,
    borderColor: Color.textSecondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadGridText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  imageGridItem: {
    width: 108,
    aspectRatio: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Color.thumbBg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageGridItemSelected: {
    borderColor: Color.textPrimary,
  },
  imageGridImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  checkIconContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Color.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploaderInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  uploaderName: {
    fontSize: 10,
    color: Color.background,
    textAlign: 'center',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Color.background,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  confirmButton: {
    backgroundColor: Color.textPrimary,
    borderRadius: Radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: Color.background,
    fontSize: 16,
  },
});

export default SharedImageSelectionModalView;
