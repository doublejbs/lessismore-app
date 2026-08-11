import { FC, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Liquid, LiquidRadius } from '@/constants/DesignTokens';

// GD-1 1층(사진 줄) 크기. 가운데 단독 줄이라 좌우 컬럼 폭을 나눠 쓸 필요가 없어,
// "내 물건이 맞나"를 한눈에 알아볼 수 있는 140pt 정사각으로 둔다.
const IMAGE_SIZE = 140;

interface Props {
  imageUrl: string;
}

/**
 * 사용자가 올린 본인 장비 사진(GD-1·GD-13) — **보여주기만 한다.**
 *
 * 추가·교체·삭제는 `수정` 화면이 맡는다(2026-08-11 디자인 리뷰) — 상세는 장비를 판단하는
 * 화면이라 관리 조작이 자리를 차지하지 않아야 하고, 사진의 단일 소스가 편집 화면 하나로
 * 모이면 상세는 `Gear.getImageUrl()`만 그리면 되어 화면을 다시 읽을 때 값이 어긋나지 않는다.
 * 정사각 크롭으로 받으므로(`GearImageUpload`) 표시도 정사각이다.
 */
const WarehouseDetailImagePreviewView: FC<Props> = ({ imageUrl }) => {
  /**
   * 참조가 끊긴 레거시 URL은 로드에 실패한다(DataModel §1) — 깨진 아이콘을 남기지 않고
   * 사진 없음과 똑같이 줄째 비운다(GD-13). 실패한 **URL**을 기억해 사진이 바뀌면
   * (수정 화면에서 새로 올린 뒤 돌아온 경우) 다시 그려 본다.
   */
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const handleError = () => {
    setFailedUrl(imageUrl);
  };

  if (failedUrl === imageUrl) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole='image'
      accessibilityLabel='장비 사진'
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode='cover'
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: LiquidRadius.card,
    // 로드 전·실패 직전의 빈 영역이 지면 위에서 떠 보이지 않게 가라앉은 면을 깐다.
    backgroundColor: Liquid.surfaceSunken,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default WarehouseDetailImagePreviewView;
