import { FC } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Color, Radius } from '@/constants/DesignTokens';

const IMAGE_SIZE = 140;

interface Props {
  imageUrl: string;
  busy: boolean;
  onPress: () => void;
  onError: () => void;
}

// 사용자가 올린 본인 장비 사진(GD-1·GD-13). 탭하면 교체·삭제 시트가 열린다.
// 정사각 크롭으로 받으므로(GearImageUpload) 표시도 정사각이다.
const WarehouseDetailImagePreviewView: FC<Props> = ({
  imageUrl,
  busy,
  onPress,
  onError,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
      accessibilityRole='button'
      accessibilityLabel='장비 사진'
      accessibilityHint='사진을 교체하거나 삭제할 수 있어요'
      accessibilityState={{ disabled: busy }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode='cover'
        // 참조가 끊긴 레거시 URL은 로드에 실패한다 — 깨진 아이콘을 남기지 않고
        // 사진 없음 상태로 되돌린다(GD-13).
        onError={onError}
      />
      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color={Color.background} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: Radius.card,
    // 로드 전·실패 직전의 빈 영역이 흰 배경 위에서 떠 보이지 않게 표면색을 깐다.
    backgroundColor: Color.thumbBg,
    overflow: 'hidden',
  },
  image: {
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
    backgroundColor: Color.overlay,
  },
});

export default WarehouseDetailImagePreviewView;
