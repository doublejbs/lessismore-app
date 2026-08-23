import { FC, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '@/model/gear/Gear';
import { Spacing } from '@/constants/DesignTokens';
import GearImageSource from '@/model/gear-image/GearImageSource';
import GearImageUpload from '@/model/gear-image/GearImageUpload';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import WarehouseDetailImageAddView from './WarehouseDetailImageAddView';
import WarehouseDetailImagePreviewView from './WarehouseDetailImagePreviewView';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import app from '@/model/app/App';

interface Props {
  gear: Gear;
}

/**
 * 기본 정보 섹션 조립(GD-1) + 내 장비 사진 업로드(GD-13).
 *
 * **보유 장비에서만 렌더한다** — 호출부(WarehouseDetailView)가 `isAdded`로 가른다.
 * 업로드 상태·핸들러는 전부 `GearImageUpload`가 들고 있고 이 뷰는 조립만 한다.
 *
 * "지금 화면에 사진이 있느냐"(업로드·삭제로 바뀐다)를 아는 곳이 여기라서 조립 지점이 된다(GD-1).
 * 사진이 있으면 정보 뷰에 사진 슬롯을 넘겨 **가운데 사진 줄**을 그리게 하고, 없으면 그 자리에
 * `사진 추가` 행을 정보 뷰 **위** 전체 폭에 둔다 — 정체 줄은 어느 쪽이든 동일하다.
 */
const WarehouseDetailBasicInfoView: FC<Props> = ({ gear }) => {
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
          text: app.getL10n().t('gearDetail.chooseFromAlbum'),
          onPress: handlePressLibrary,
        },
        {
          icon: 'camera-outline' as const,
          text: app.getL10n().t('gearDetail.takePhoto'),
          onPress: handlePressCamera,
        },
      ]
    : [
        {
          icon: 'sync-outline' as const,
          text: app.getL10n().t('gearDetail.replacePhoto'),
          onPress: handlePressReplace,
        },
        {
          icon: 'trash-outline' as const,
          text: app.getL10n().t('gearDetail.deletePhoto'),
          onPress: handlePressDelete,
        },
      ];

  // 사진 줄(1층)의 내용물. 없으면 정보 뷰가 줄 자체를 렌더하지 않는다(GD-1).
  const photo = imageUrl ? (
    <WarehouseDetailImagePreviewView
      imageUrl={imageUrl}
      busy={busy}
      onPress={handlePressImage}
      onError={handleImageError}
    />
  ) : null;

  return (
    <>
      {/* `사진 추가`는 이미지 자리를 대신하는 플레이스홀더가 아니라 액션이라 정보 블록 위
          전체 폭 행으로 둔다. 사진이 생기면 그 자리가 가운데 사진 줄로 바뀐다(GD-1·GD-13). */}
      {photo ? null : (
        <View style={styles.addRow}>
          <WarehouseDetailImageAddView busy={busy} onPress={handlePressAdd} />
        </View>
      )}
      <WarehouseDetailInformationView gear={gear} photo={photo} />
      <BottomMenuModalView
        visible={gearImageUpload.isSheetVisible()}
        onClose={handleCloseSheet}
        menuItems={menuItems}
      />
    </>
  );
};

const styles = StyleSheet.create({
  addRow: {
    // 아래 기본 정보 섹션과 같은 좌우 정렬선(20pt). 하단 여백은 정보 섹션의 paddingTop이 맡는다.
    paddingTop: Spacing.screenH,
    paddingHorizontal: Spacing.screenH,
  },
});

export default observer(WarehouseDetailBasicInfoView);
