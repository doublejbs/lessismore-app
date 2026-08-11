import { FC, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import GearImageSource from '@/model/gear-image/GearImageSource';
import GearImageUpload from '@/model/gear-image/GearImageUpload';
import { Liquid, LiquidMotion, LiquidRadius } from '@/constants/DesignTokens';

interface Props {
  gearId: string;
  imageUrl: string | undefined;
}

// 사진이 있을 때의 정사각 크기 — 장비 상세의 사진 줄(GD-1)과 같은 140pt다.
const IMAGE_SIZE = 140;
// 점선 슬롯 높이. 고정 높이가 아니라 **바닥값**이라야 OS 글자 크기를 키웠을 때 아이콘·문구가
// 잘리지 않고 행이 함께 늘어난다(Dynamic Type). HIG 최소 터치 타깃 44pt 이상.
const SLOT_HEIGHT = 56;

/**
 * GE-2 수정 폼의 사진 필드 — 내 장비 사진 추가·교체·삭제(GD-13).
 *
 * **사진을 관리하는 자리는 이 화면 하나다**(2026-08-11 디자인 리뷰). 예전에는 장비 상세
 * 정체 블록 아래에 `사진 추가` 점선 박스가 폭 전체로 놓였는데, 이 앱은 장비 이미지를
 * 취급하지 않기로 한 제품이라(DataModel §1) 대다수 장비에서 화면 두 번째 블록이 콘텐츠 0인
 * 빈 칸이었다. 상세는 사진이 **있을 때만** 그려 보여주고(GD-1), 올리는 경로는 이미 있는
 * `수정` 진입점 안으로 들어왔다 — 폼의 다른 필드들과 같은 "값을 채우는 일"이다.
 *
 * 업로드 상태·핸들러는 전부 `GearImageUpload`가 들고 있고 이 뷰는 조립만 한다. 사진은 폼
 * 저장(`저장하기`)과 무관하게 **고른 즉시** 저장된다 — Storage 업로드와 문서 갱신이 한 흐름이라
 * (DM-9) 되돌릴 지점을 폼 저장까지 미루면 올린 파일이 참조 없이 남는다.
 */
const GearEditPhotoView: FC<Props> = ({ gearId, imageUrl }) => {
  // 진입 시점의 사진 URL로 한 번만 씨를 받는다 — 이후 화면의 소스는 모델이다
  // (`Gear`는 불변이라 업로드 결과를 담을 수 없다).
  const [gearImageUpload] = useState(() =>
    GearImageUpload.from(gearId, imageUrl)
  );
  const visibleImageUrl = gearImageUpload.getVisibleImageUrl();
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

  const renderImage = (url: string) => (
    <TouchableOpacity
      style={styles.image}
      onPress={handlePressImage}
      disabled={busy}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel='장비 사진'
      accessibilityHint='사진을 교체하거나 삭제할 수 있어요'
      accessibilityState={{ disabled: busy }}
    >
      <Image
        source={{ uri: url }}
        style={styles.imageFill}
        resizeMode='cover'
        // 참조가 끊긴 레거시 URL은 로드에 실패한다 — 깨진 아이콘을 남기지 않고
        // 사진 없음 상태로 되돌린다(GD-13).
        onError={handleImageError}
      />
      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color={Liquid.surface} />
        </View>
      )}
    </TouchableOpacity>
  );

  // 사진이 없을 때의 진입점. 이미지 자리를 대신 차지하는 플레이스홀더가 아니라 **액션**이라
  // 점선 슬롯으로 둔다.
  const renderAddSlot = () => (
    <TouchableOpacity
      style={styles.addSlot}
      onPress={handlePressAdd}
      disabled={busy}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel='사진 추가'
      accessibilityState={{ disabled: busy }}
    >
      {busy ? (
        <ActivityIndicator size='small' color={Liquid.inkMuted} />
      ) : (
        <Ionicons name='camera-outline' size={19} color={Liquid.inkMuted} />
      )}
      <PretendardText weight='medium' style={styles.addText}>
        {busy ? '사진 올리는 중' : '사진 추가'}
      </PretendardText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.field}>
      <LiquidFieldLabel>사진</LiquidFieldLabel>
      {visibleImageUrl ? renderImage(visibleImageUrl) : renderAddSlot()}
      <BottomMenuModalView
        visible={gearImageUpload.isSheetVisible()}
        onClose={handleCloseSheet}
        menuItems={menuItems}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백을 들고 있어 gap을 겹치지 않는다(다른 필드와 동일).
  field: {
    flexDirection: 'column',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: LiquidRadius.card,
    // 로드 전·실패 직전의 빈 영역이 지면 위에서 떠 보이지 않게 가라앉은 면을 깐다.
    backgroundColor: Liquid.surfaceSunken,
    overflow: 'hidden',
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Liquid.scrim,
  },
  addSlot: {
    minHeight: SLOT_HEIGHT,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // 점선은 실선 헤어라인보다 굵게 그려져 같은 농도면 무거워 보인다 — 전용 값을 쓴다.
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Liquid.dashedStroke,
    borderRadius: LiquidRadius.tile,
  },
  addText: {
    fontSize: 14,
    color: Liquid.inkMuted,
  },
});

export default observer(GearEditPhotoView);
