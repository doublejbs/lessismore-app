import { FC, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '@/model/gear/Gear';
import GearImageSource from '@/model/gear-image/GearImageSource';
import GearImageUpload from '@/model/gear-image/GearImageUpload';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import WarehouseDetailImageAddView from './WarehouseDetailImageAddView';
import WarehouseDetailImagePreviewView from './WarehouseDetailImagePreviewView';

interface Props {
  gear: Gear;
}

/**
 * 내 장비 사진 영역(GD-13) — 기본 정보 블록 위에 놓인다(GD-1).
 *
 * **보유 장비에서만 렌더한다** — 호출부(WarehouseDetailView)가 `isAdded`로 가른다.
 * 업로드 상태·핸들러는 전부 `GearImageUpload`가 들고 있고 이 뷰는 조립만 한다.
 */
const WarehouseDetailImageView: FC<Props> = ({ gear }) => {
  // 진입 시점의 사진 URL로 한 번만 씨를 받는다 — 이후 화면의 소스는 모델이다
  // (`Gear`는 불변이라 업로드 결과를 담을 수 없다).
  const [gearImageUpload] = useState(() =>
    GearImageUpload.from(gear.getId(), gear.getImageUrl())
  );
  const imageUrl = gearImageUpload.getVisibleImageUrl();
  const busy = gearImageUpload.isBusy();

  const handlePressAdd = () => {
    gearImageUpload.openSourceSheet();
  };

  const handlePressImage = () => {
    gearImageUpload.openActionSheet();
  };

  const handleImageError = () => {
    gearImageUpload.markImageLoadFailed();
  };

  const handleCloseSheet = () => {
    gearImageUpload.closeSheet();
  };

  const handlePressLibrary = () => {
    void gearImageUpload.pickImage(GearImageSource.Library);
  };

  const handlePressCamera = () => {
    void gearImageUpload.pickImage(GearImageSource.Camera);
  };

  const handlePressReplace = () => {
    gearImageUpload.replaceImage();
  };

  const handlePressDelete = () => {
    gearImageUpload.confirmDelete();
  };

  // 출처(앨범·카메라)와 교체·삭제는 같은 시트를 쓴다(GearImageSheet 주석 참고).
  const menuItems = gearImageUpload.isSourceSheet()
    ? [
        {
          icon: 'images-outline' as const,
          text: '앨범에서 선택',
          onPress: handlePressLibrary,
        },
        {
          icon: 'camera-outline' as const,
          text: '사진 촬영',
          onPress: handlePressCamera,
        },
      ]
    : [
        {
          icon: 'sync-outline' as const,
          text: '사진 교체하기',
          onPress: handlePressReplace,
        },
        {
          icon: 'trash-outline' as const,
          text: '사진 삭제하기',
          onPress: handlePressDelete,
        },
      ];

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <WarehouseDetailImagePreviewView
          imageUrl={imageUrl}
          busy={busy}
          onPress={handlePressImage}
          onError={handleImageError}
        />
      ) : (
        <WarehouseDetailImageAddView busy={busy} onPress={handlePressAdd} />
      )}
      <BottomMenuModalView
        visible={gearImageUpload.isSheetVisible()}
        onClose={handleCloseSheet}
        menuItems={menuItems}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 아래 기본 정보 섹션과 같은 좌우 정렬선(20pt). 하단 여백은 정보 섹션의 paddingTop이 맡는다.
    paddingTop: 20,
    paddingHorizontal: 20,
  },
});

export default observer(WarehouseDetailImageView);
