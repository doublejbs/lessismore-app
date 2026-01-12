import React, { FC, useState } from 'react';
import {
  View,
  Text,
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

      app.getToastManager()?.show({ message: '이미지가 업로드되었습니다.' });
      onUploadComplete();
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      Alert.alert('오류', '이미지를 업로드하는 중 오류가 발생했습니다.');
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
          '이미지를 선택하려면 갤러리 접근 권한이 필요합니다.'
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
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  const handleUploadPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['취소', '사진 촬영', '사진 보관함에서 선택'],
          cancelButtonIndex: 0,
          title: '이미지 업로드',
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
        '이미지 업로드',
        '어떤 방법으로 이미지를 추가하시겠습니까?',
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
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name='close' size={24} color='#191F28' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>다른 이미지 선택</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.guideContainer}>
          <Text style={styles.guideText}>
            이미지를 업로드하면 다른 사용자가 볼 수 있고 활용할 수 있습니다.
          </Text>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color='#191F28' />
            </View>
          ) : images.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name='images-outline' size={48} color='#999' />
              <Text style={styles.emptyText}>
                아직 등록된 이미지가 없습니다
              </Text>
              <Text style={styles.emptySubText}>
                하단 버튼을 눌러 이미지를 등록하면{'\n'}다른 사용자들도 볼 수
                있습니다
              </Text>
            </View>
          ) : (
            <View style={styles.imageGridContainer}>
              <Text style={styles.imageCountText}>
                {images.length}개의 이미지
              </Text>
              <View style={styles.imageGridList}>
                {images.map(image => {
                  const isSelected = selectedImageUrl === image.url;

                  return (
                    <TouchableOpacity
                      key={image.id}
                      style={[
                        styles.imageGridItem,
                        isSelected && styles.imageGridItemSelected,
                      ]}
                      onPress={() => onSelectImage(image)}
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
                              color='white'
                            />
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

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadingButton]}
            onPress={handleUploadPress}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size='small' color='white' />
            ) : (
              <>
                <Text style={styles.uploadButtonText}>이미지 추가</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#191F28',
    fontFamily: 'Inter_600SemiBold',
  },
  guideContainer: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  guideText: {
    fontSize: 13,
    color: '#fff',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191F28',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  imageGridContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  imageCountText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  imageGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageGridItem: {
    width: 108,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageGridItemSelected: {
    borderColor: '#000',
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
    backgroundColor: '#000',
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
    color: 'white',
    textAlign: 'center',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  uploadButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingButton: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SharedImageSelectionModalView;
