import { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const FOREST_ASPECT_RATIO = 1804 / 872;

/**
 * 정보 탭 하단 고정 지면.
 *
 * 홈의 HomeHeroBackgroundView처럼 스크롤 콘텐츠 뒤에 깔리는 장식 레이어다(AU-4).
 * 정보 탭의 마지막 콘텐츠를 가리지 않도록 스크롤 쪽에서 이미지 높이만큼 여백을 낸다.
 */
const InfoFooterBackgroundView: FC = () => {
  return (
    <View
      pointerEvents='none'
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={styles.container}
    >
      <Image
        source={require('@/assets/images/info-footer-forest.png')}
        style={styles.image}
        resizeMode='contain'
        accessible={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: FOREST_ASPECT_RATIO,
  },
});

export default InfoFooterBackgroundView;
